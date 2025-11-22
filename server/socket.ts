import type { Server as HTTPServer } from "http";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { streamGeminiTranscription, summarizeTranscript } from "@/lib/gemini";

const MAX_QUEUE_SIZE = 32;

const joinSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
});

const audioChunkSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  chunk: z.instanceof(Buffer).or(z.any()),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  mimeType: z.string().default("audio/webm"),
});

const stopSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  audioUrl: z.string().url().optional(),
});

type SessionBuffer = {
  queue: Buffer[];
  processing: boolean;
};

const sessionBuffers = new Map<string, SessionBuffer>();

function getOrCreateBuffer(sessionId: string): SessionBuffer {
  if (!sessionBuffers.has(sessionId)) {
    sessionBuffers.set(sessionId, { queue: [], processing: false });
  }

  return sessionBuffers.get(sessionId)!;
}

async function processQueue(io: Server, sessionId: string, mimeType: string) {
  const bufferState = sessionBuffers.get(sessionId);
  if (!bufferState || bufferState.processing) {
    return;
  }

  bufferState.processing = true;
  const chunk = bufferState.queue.shift();

  if (!chunk) {
    bufferState.processing = false;
    return;
  }

  try {
    const text = await streamGeminiTranscription(chunk, {
      mimeType,
      onToken: (token: string) => {
        io.to(sessionId).emit("transcription-token", { token });
      },
    });

    if (text) {
      await prisma.transcriptSegment.create({
        data: {
          sessionId,
          text,
        },
      });
      io.to(sessionId).emit("transcription-chunk", { text });
    }
  } catch (error) {
    io.to(sessionId).emit("transcription-error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    bufferState.processing = false;
    if (bufferState.queue.length) {
      queueMicrotask(() => processQueue(io, sessionId, mimeType));
    }
  }
}

export function initSocketServer(server: HTTPServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e7,
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join-session", async (payload: unknown) => {
      const parsed = joinSessionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("join-error", parsed.error.flatten());
        return;
      }

      socket.join(parsed.data.sessionId);

      await prisma.session.upsert({
        where: { id: parsed.data.sessionId },
        update: { state: "RECORDING" },
        create: {
          id: parsed.data.sessionId,
          userId: parsed.data.userId,
          state: "RECORDING",
        },
      });

      socket.emit("joined", { sessionId: parsed.data.sessionId });
    });

    socket.on("audio-stream", async (payload: unknown) => {
      const parsed = audioChunkSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("transcription-error", parsed.error.flatten());
        return;
      }

      const { sessionId, mimeType } = parsed.data;
      const chunkBuffer =
        parsed.data.chunk instanceof Buffer
          ? parsed.data.chunk
          : Buffer.from(parsed.data.chunk);

      const bufferState = getOrCreateBuffer(sessionId);

      if (bufferState.queue.length >= MAX_QUEUE_SIZE) {
        socket.emit("buffer-overflow", { size: bufferState.queue.length });
      }

      bufferState.queue.push(chunkBuffer);
      if (!bufferState.processing) {
        processQueue(io, sessionId, mimeType);
      }
    });

    socket.on("stop-session", async (payload: unknown) => {
      const parsed = stopSessionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("session-error", parsed.error.flatten());
        return;
      }

      const { sessionId, audioUrl } = parsed.data;

      io.to(sessionId).emit("processing", { sessionId });

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          state: "PROCESSING",
          endedAt: new Date(),
          audioUrl,
        },
      });

      const segments = await prisma.transcriptSegment.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      const transcript = segments.map((s) => s.text).join("\n");
      const summary = await summarizeTranscript(transcript);

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          state: "COMPLETED",
          summary,
        },
      });

      io.to(sessionId).emit("completed", { summary, transcript });
      sessionBuffers.delete(sessionId);
    });

    socket.on("disconnect", () => {
      // Intentionally empty but kept for future metrics hooks.
    });
  });

  return io;
}
