"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMachine } from "@xstate/react";
import { createMachine } from "xstate";
import { io, type Socket } from "socket.io-client";

export type RecorderStatus =
  | "IDLE"
  | "RECORDING"
  | "PAUSED"
  | "PROCESSING"
  | "COMPLETED";

export interface UseAudioStreamOptions {
  sessionId: string;
  userId: string;
}

interface RecorderControls {
  startMicrophone: () => Promise<void>;
  startTabShare: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  status: RecorderStatus;
  tokens: string[];
  transcript: string[];
  summary?: string;
  error?: string;
}

export function useAudioStream({
  sessionId,
  userId,
}: UseAudioStreamOptions): RecorderControls {
  const recorderMachine = useMemo(
    () =>
      createMachine({
        id: "recorder",
        initial: "IDLE",

        types: {} as {
          context: Record<string, never>;
          events:
            | { type: "START" }
            | { type: "PAUSE" }
            | { type: "RESUME" }
            | { type: "PROCESS" }
            | { type: "COMPLETE" }
            | { type: "RESET" }
            | { type: "SYNC"; status: RecorderStatus };
        },

        states: {
          IDLE: { on: { START: "RECORDING" } },

          RECORDING: {
            on: {
              PAUSE: "PAUSED",
              PROCESS: "PROCESSING",
              COMPLETE: "COMPLETED",
              RESET: "IDLE",
            },
          },

          PAUSED: {
            on: {
              RESUME: "RECORDING",
              PROCESS: "PROCESSING",
              RESET: "IDLE",
            },
          },

          PROCESSING: {
            on: { COMPLETE: "COMPLETED", RESET: "IDLE" },
          },

          COMPLETED: {
            on: { START: "RECORDING", RESET: "IDLE" },
          },
        },

        // ⭐ FULLY SAFE ROOT-LEVEL TRANSITIONS
        on: {
          RESET: ".IDLE",

          SYNC: [
            {
              guard: (_ctx, e) =>
                e?.type === "SYNC" && e.status === "RECORDING",
              target: ".RECORDING",
            },
            {
              guard: (_ctx, e) =>
                e?.type === "SYNC" && e.status === "PAUSED",
              target: ".PAUSED",
            },
            {
              guard: (_ctx, e) =>
                e?.type === "SYNC" && e.status === "PROCESSING",
              target: ".PROCESSING",
            },
            {
              guard: (_ctx, e) =>
                e?.type === "SYNC" && e.status === "COMPLETED",
              target: ".COMPLETED",
            },

            // fallback when initiating or unknown/missing status
            { target: ".IDLE" },
          ],
        },
      }),
    []
  );

  const [recorderState, send] = useMachine(recorderMachine);
  const status = recorderState.value as RecorderStatus;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingResolveRef = useRef<() => void | null>(null);

  const [tokens, setTokens] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>();
  const [error, setError] = useState<string>();

  // ──────────────────────────────────────────
  // SOCKET.IO INITIALIZATION
  // ──────────────────────────────────────────
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? window.location.origin;

    const socket = io(url, {
      autoConnect: true,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    socket.emit("join-session", { sessionId, userId });

    socket.on("connect", () => setError(undefined));

    socket.on("connect_error", (err) => {
      setError(err instanceof Error ? err.message : "Unable to connect");
    });

    socket.on("transcription-token", ({ token }) =>
      setTokens((p) => [...p, token])
    );

    socket.on("transcription-chunk", ({ text }) =>
      setTranscript((p) => [...p, text])
    );

    socket.on("buffer-overflow", () =>
      setError("Processing backlog detected.")
    );

    socket.on("processing", () => send({ type: "PROCESS" }));

    socket.on("completed", ({ summary }) => {
      setSummary(summary);
      send({ type: "COMPLETE" });
    });

    socket.on("transcription-error", (payload) => {
      if (typeof payload === "string") setError(payload);
      else if (payload && typeof payload === "object")
        setError(String(payload.message ?? "Transcription failed"));
      else setError("Transcription failed");
    });

    const stopOnUnload = () =>
      socket.emit("stop-session", { sessionId, userId });

    window.addEventListener("beforeunload", stopOnUnload);

    // Restore previous saved state
    const persisted = localStorage.getItem(`scribeai-${sessionId}`);
    if (persisted) {
      const { status } = JSON.parse(persisted);
      send({ type: "SYNC", status });
    }

    return () => {
      window.removeEventListener("beforeunload", stopOnUnload);
      socket.disconnect();
    };
  }, [send, sessionId, userId]);

  // persist status
  useEffect(() => {
    localStorage.setItem(`scribeai-${sessionId}`, JSON.stringify({ status }));
  }, [sessionId, status]);

  // ──────────────────────────────────────────
  // MEDIA RECORDER SETUP
  // ──────────────────────────────────────────
  const setupMediaRecorder = useCallback(
    async (stream: MediaStream) => {
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (!event.data.size || !socketRef.current) return;

        event.data.arrayBuffer().then((buffer) => {
          socketRef.current?.emit("audio-stream", {
            sessionId,
            userId,
            chunk: buffer,
            start: event.timecode ?? Date.now(),
            end: (event.timecode ?? Date.now()) + event.data.size,
            mimeType: event.data.type,
          });
        });
      };

      recorder.onstop = () => {
        pendingResolveRef.current?.();
        pendingResolveRef.current = null;
      };

      recorder.start(1000);
      send({ type: "START" });
    },
    [send, sessionId, userId]
  );

  const normalizeError = (err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return fallback;
  };

  // ──────────────────────────────────────────
  // AUDIO SOURCES
  // ──────────────────────────────────────────
  const requestMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setError(undefined);
      await setupMediaRecorder(stream);
    } catch (err) {
      setError(normalizeError(err, "Microphone permission denied."));
    }
  }, [setupMediaRecorder]);

  const requestTab = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          suppressLocalAudioPlayback: false,
        } as MediaTrackConstraints,
      });

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length)
        throw new Error("Browser provided no tab audio. Enable 'Share audio'.");

      const audioStream = new MediaStream(audioTracks);
      setError(undefined);
      await setupMediaRecorder(audioStream);

      stream.getVideoTracks().forEach((track) => track.stop());
    } catch (err) {
      setError(
        normalizeError(
          err,
          "Unable to capture tab audio. Ensure 'Share audio' is enabled."
        )
      );
    }
  }, [setupMediaRecorder]);

  // ──────────────────────────────────────────
  // RECORDER CONTROL
  // ──────────────────────────────────────────
  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      send({ type: "PAUSE" });
    }
  }, [send]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      send({ type: "RESUME" });
    }
  }, [send]);

  const stop = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    send({ type: "PROCESS" });

    await new Promise<void>((resolve) => {
      pendingResolveRef.current = resolve;
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    });

    socketRef.current?.emit("stop-session", { sessionId, userId });
  }, [send, sessionId, userId]);

  // ──────────────────────────────────────────
  // EXPORT API
  // ──────────────────────────────────────────
  return {
    startMicrophone: requestMicrophone,
    startTabShare: requestTab,
    pause,
    resume,
    stop,
    status,
    tokens,
    transcript,
    summary,
    error,
  };
}