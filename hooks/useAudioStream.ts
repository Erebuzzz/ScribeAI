"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMachine } from "@xstate/react";
import { createMachine } from "xstate";
import { io, type Socket } from "socket.io-client";

export type RecorderStatus = "IDLE" | "RECORDING" | "PAUSED" | "PROCESSING" | "COMPLETED";

export interface UseAudioStreamOptions {
  sessionId: string;
  userId: string;
  initialStatus?: RecorderStatus;
}

interface RecorderControls {
  startMicrophone: () => Promise<void>;
  startTabShare: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  reset: () => void;
  status: RecorderStatus;
  tokens: string[];
  transcript: string[];
  summary?: string;
  error?: string;
  micActive: boolean;
  tabActive: boolean;
}

/**
 * Hook that wires MediaRecorder to Socket.io streaming for live transcription.
 */
export function useAudioStream({ sessionId, userId, initialStatus }: UseAudioStreamOptions): RecorderControls {
  const recorderMachine = useMemo(
    () =>
      createMachine({
        id: "recorder",
        initial: initialStatus ?? "IDLE",
        context: {},
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
            on: {
              COMPLETE: "COMPLETED",
              RESET: "IDLE",
            },
          },
          COMPLETED: {
            on: {
              START: "RECORDING",
              RESET: "IDLE",
            },
          },
        },
        on: {
          RESET: ".IDLE",
          SYNC: [
            {
              guard: ({ event }) => event.type === "SYNC" && "status" in event && event.status === "RECORDING",
              target: ".RECORDING",
            },
            {
              guard: ({ event }) => event.type === "SYNC" && "status" in event && event.status === "PAUSED",
              target: ".PAUSED",
            },
            {
              guard: ({ event }) => event.type === "SYNC" && "status" in event && event.status === "PROCESSING",
              target: ".PROCESSING",
            },
            {
              guard: ({ event }) => event.type === "SYNC" && "status" in event && event.status === "COMPLETED",
              target: ".COMPLETED",
            },
            { target: ".IDLE" },
          ],
        },
      }),
    [initialStatus]
  );

  const [recorderState, send] = useMachine(recorderMachine);
  const status = recorderState.value as RecorderStatus;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingResolveRef = useRef<(() => void) | null>(null);

  const [tokens, setTokens] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>();
  const [error, setError] = useState<string>();
  const [micActive, setMicActive] = useState(false);
  const [tabActive, setTabActive] = useState(false);

  const tearDownMedia = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn("MediaRecorder stop failed", err);
      }
    }

    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn("Failed to stop track", err);
        }
      });
      mediaStreamRef.current = null;
    }

    if (pendingResolveRef.current) {
      pendingResolveRef.current();
      pendingResolveRef.current = null;
    }

    setMicActive(false);
    setTabActive(false);
  }, []);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? window.location.origin;
    
    const socket = io(url, {
      autoConnect: false, // Keep this false
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      console.info("Socket connected", socket.id);
      socket.emit("join-session", { sessionId, userId });
      setError(undefined);
    };

    const handleConnectError = (connErr: unknown) => {
      console.error("Socket connection error", connErr);
      setError(
        connErr instanceof Error
          ? connErr.message
          : typeof connErr === "string"
            ? connErr
            : "Unable to connect to realtime server"
      );
    };

    const handleToken = ({ token }: { token: string }) => {
      setTokens((prev) => [...prev, token]);
    };

    const handleChunk = ({ text }: { text: string }) => {
      setTranscript((prev) => [...prev, text]);
    };

    const handleBufferOverflow = () => {
      setError("Processing backlog detected. Holding chunks until Gemini catches up.");
    };

    const handleProcessing = () => send({ type: "PROCESS" });

    const handleCompleted = ({ summary: s }: { summary: string }) => {
      setSummary(s);
      tearDownMedia();
      send({ type: "COMPLETE" });
    };

    const handleTranscriptionError = (payload: unknown) => {
      console.log("FULL ERROR PAYLOAD:", payload);
      
      if (typeof payload === "string") {
        setError(payload);
      } else if (payload && typeof payload === "object" && "message" in payload) {
        setError(String((payload as { message?: string }).message ?? "Transcription failed"));
      } else {
        setError("Transcription failed");
      }
    };

    const handleBeforeUnload = () => {
      socket.emit("stop-session", { sessionId, userId });
    };

    // Attach listeners
    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("transcription-token", handleToken);
    socket.on("transcription-chunk", handleChunk);
    socket.on("buffer-overflow", handleBufferOverflow);
    socket.on("processing", handleProcessing);
    socket.on("completed", handleCompleted);
    socket.on("transcription-error", handleTranscriptionError);

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Restore state from localStorage
    const persisted = window.localStorage.getItem(`scribeai-${sessionId}`);
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted) as { status: RecorderStatus };
        // Only sync if valid, otherwise ignore
        if (parsed.status) send({ type: "SYNC", status: parsed.status });
      } catch (e) {
        console.warn("Failed to parse persisted state", e);
      }
    }

    let connectionTimer: ReturnType<typeof setTimeout> | null = null;

    if (initialStatus !== "COMPLETED") {
      connectionTimer = setTimeout(() => {
        socket.connect();
      }, 0);
    }

    return () => {
      if (connectionTimer) {
        clearTimeout(connectionTimer);
      }
      
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.removeListener("connect", handleConnect);
      socket.removeListener("connect_error", handleConnectError);
      socket.removeListener("transcription-token", handleToken);
      socket.removeListener("transcription-chunk", handleChunk);
      socket.removeListener("buffer-overflow", handleBufferOverflow);
      socket.removeListener("processing", handleProcessing);
      socket.removeListener("completed", handleCompleted);
      socket.removeListener("transcription-error", handleTranscriptionError);

      socket.disconnect();
      tearDownMedia();
    };
  }, [initialStatus, send, sessionId, tearDownMedia, userId]);

  const ensureSocketConnected = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }
    if (socket.disconnected) {
      socket.connect();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(`scribeai-${sessionId}`, JSON.stringify({ status }));
  }, [sessionId, status]);

  const setupMediaRecorder = useCallback(
    async (stream: MediaStream) => {
      mediaStreamRef.current = stream;
      ensureSocketConnected();
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
      send({ type: "START" });
    },
    [ensureSocketConnected, send, sessionId, userId]
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
      setMicActive(true);
      setTabActive(false);
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
      setMicActive(false);
      setTabActive(true);

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
      send({ type: "PAUSE" });
    }
  }, [send]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      send({ type: "RESUME" });
    }
  }, [send]);

  const stop = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      return;
    }

    send({ type: "PROCESS" });

    await new Promise<void>((resolve) => {
      pendingResolveRef.current = resolve;
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    });

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    setMicActive(false);
    setTabActive(false);
    socketRef.current?.emit("stop-session", { sessionId, userId });
  }, [send, sessionId, userId]);

  const reset = useCallback(() => {
    tearDownMedia();
    setTokens([]);
    setTranscript([]);
    setSummary(undefined);
    setError(undefined);
    send({ type: "RESET" });
  }, [send, tearDownMedia]);

  return {
    startMicrophone: requestMicrophone,
    startTabShare: requestTab,
    pause,
    resume,
    stop,
    reset,
    status,
    tokens,
    transcript,
    summary,
    error,
    micActive,
    tabActive,
  };
}