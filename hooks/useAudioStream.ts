"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type RecorderStatus = "IDLE" | "RECORDING" | "PAUSED" | "PROCESSING" | "COMPLETED";

type RecorderAction =
  | { type: "INIT" }
  | { type: "RECORDING" }
  | { type: "PAUSE" }
  | { type: "PROCESSING" }
  | { type: "COMPLETE" }
  | { type: "RESET" };

function recorderReducer(state: RecorderStatus, action: RecorderAction): RecorderStatus {
  switch (action.type) {
    case "INIT":
      return "IDLE";
    case "RECORDING":
      return "RECORDING";
    case "PAUSE":
      return "PAUSED";
    case "PROCESSING":
      return "PROCESSING";
    case "COMPLETE":
      return "COMPLETED";
    case "RESET":
    default:
      return "IDLE";
  }
}

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

/**
 * Hook that wires MediaRecorder to Socket.io streaming for live transcription.
 */
export function useAudioStream({ sessionId, userId }: UseAudioStreamOptions): RecorderControls {
  const [status, dispatch] = useReducer(recorderReducer, "IDLE");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingResolveRef = useRef<(() => void) | null>(null);
  const [tokens, setTokens] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>();
  const [error, setError] = useState<string>();

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

    socket.on("connect", () => {
      console.info("Socket connected", socket.id, socket.io.opts); // helps diagnose host/transport issues
      setError(undefined);
    });

    socket.on("connect_error", (connErr) => {
      console.error("Socket connection error", connErr);
      setError(
        connErr instanceof Error
          ? connErr.message
          : typeof connErr === "string"
            ? connErr
            : "Unable to connect to realtime server"
      );
    });

    socket.on("transcription-token", ({ token }) => {
      setTokens((prev) => [...prev, token]);
    });

    socket.on("transcription-chunk", ({ text }) => {
      setTranscript((prev) => [...prev, text]);
    });

    socket.on("buffer-overflow", () => {
      setError("Processing backlog detected. Holding chunks until Gemini catches up.");
    });

    socket.on("processing", () => dispatch({ type: "PROCESSING" }));

    socket.on("completed", ({ summary: s }) => {
      setSummary(s);
      dispatch({ type: "COMPLETE" });
    });

    socket.on("transcription-error", (payload) => {
      if (typeof payload === "string") {
        setError(payload);
      } else if (payload && typeof payload === "object" && "message" in payload) {
        setError(String((payload as { message?: string }).message ?? "Transcription failed"));
      } else {
        setError("Transcription failed");
      }
    });

    const handleBeforeUnload = () => {
      socket.emit("stop-session", { sessionId, userId });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const persisted = window.localStorage.getItem(`scribeai-${sessionId}`);
    if (persisted) {
      const parsed = JSON.parse(persisted) as { status: RecorderStatus };
      dispatch({ type: parsed.status === "RECORDING" ? "RECORDING" : "INIT" });
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.disconnect();
    };
  }, [sessionId, userId]);

  const persistState = (nextStatus: RecorderStatus) => {
    window.localStorage.setItem(
      `scribeai-${sessionId}`,
      JSON.stringify({ status: nextStatus })
    );
  };

  const setupMediaRecorder = useCallback(
    async (stream: MediaStream) => {
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (!event.data.size || !socketRef.current) {
          return;
        }

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
      dispatch({ type: "RECORDING" });
      persistState("RECORDING");
    },
    [sessionId, userId]
  );

  const normalizeError = (err: unknown, fallback: string) => {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === "string") {
      return err;
    }
    return fallback;
  };

  const requestMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setError(undefined);
      await setupMediaRecorder(stream);
    } catch (err) {
      setError(normalizeError(err, "Microphone permission was denied."));
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
      if (!audioTracks.length) {
        throw new Error("Browser did not provide tab audio. Choose a tab and enable \"Share audio\".");
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      setError(undefined);
      await setupMediaRecorder(audioOnlyStream);

      // Stop the captured video track so we are not recording the screen unnecessarily.
      stream.getVideoTracks().forEach((track) => track.stop());
    } catch (err) {
      setError(
        normalizeError(
          err,
          "Unable to capture tab audio. Make sure you pick a tab and enable the 'Share audio' checkbox."
        )
      );
    }
  }, [setupMediaRecorder]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      dispatch({ type: "PAUSE" });
      persistState("PAUSED");
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      dispatch({ type: "RECORDING" });
      persistState("RECORDING");
    }
  }, []);

  const stop = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      return;
    }

    dispatch({ type: "PROCESSING" });
    persistState("PROCESSING");

    await new Promise<void>((resolve) => {
      pendingResolveRef.current = resolve;
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    });

    socketRef.current?.emit("stop-session", { sessionId, userId });
  }, [sessionId, userId]);

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
