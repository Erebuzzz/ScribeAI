"use client";

import { Monitor, PauseCircle, PlayCircle, Square } from "lucide-react";
import { useMemo } from "react";
import { useAudioStream } from "@/hooks/useAudioStream";

interface SessionRecorderProps {
  sessionId: string;
  userId: string;
  title: string;
}

/**
 * Client component that wires UI controls to the streaming hook.
 */
export function SessionRecorder({ sessionId, userId, title }: SessionRecorderProps) {
  const { startMicrophone, startTabShare, pause, resume, stop, status, transcript, tokens, summary, error } =
    useAudioStream({ sessionId, userId });

  const actionsDisabled = useMemo(() => status === "PROCESSING" || status === "COMPLETED", [status]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.5em] text-white/40">Live session</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-white/60">State: {status}</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={startMicrophone}
          disabled={actionsDisabled}
          className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
        >
          <PlayCircle className="h-4 w-4" /> Mic
        </button>
        <button
          onClick={startTabShare}
          disabled={actionsDisabled}
          className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
        >
          <Monitor className="h-4 w-4" /> Tab Audio
        </button>
        <button onClick={pause} disabled={status !== "RECORDING"} className="rounded-full border border-white/20 px-4 py-2 text-sm">
          <PauseCircle className="mr-2 inline h-4 w-4" /> Pause
        </button>
        <button onClick={resume} disabled={status !== "PAUSED"} className="rounded-full border border-white/20 px-4 py-2 text-sm">
          <PlayCircle className="mr-2 inline h-4 w-4" /> Resume
        </button>
        <button onClick={stop} className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-semibold">
          <Square className="mr-2 inline h-4 w-4" /> Stop & Summarize
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-lg font-semibold">Live transcription</h2>
          <div className="mt-4 flex min-h-[200px] flex-col gap-2 overflow-auto rounded-xl bg-black/40 p-4 text-sm">
            {tokens.length === 0 && <p className="text-white/40">Waiting for tokens...</p>}
            {tokens.map((token, idx) => (
              <p key={idx} className="text-white/80">
                {token}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-lg font-semibold">Buffered transcript</h2>
          <div className="mt-4 min-h-[200px] space-y-2 overflow-auto rounded-xl bg-black/40 p-4 text-sm">
            {transcript.length === 0 && <p className="text-white/40">No transcript chunks yet.</p>}
            {transcript.map((line, idx) => (
              <p key={idx} className="text-white/70">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {summary && (
        <section className="rounded-2xl border border-accent/40 bg-accent/10 p-6">
          <h2 className="text-lg font-semibold text-accent">AI Summary</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-white/80">{summary}</p>
        </section>
      )}
    </div>
  );
}
