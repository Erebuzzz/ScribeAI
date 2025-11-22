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
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-text-secondary">Live session</p>
        <h1 className="font-display text-3xl text-text-primary">{title}</h1>
        <p className="text-sm text-text-secondary">
          State: <span className="text-text-primary">{status}</span>
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={startMicrophone}
          disabled={actionsDisabled}
          className="inline-flex items-center gap-2 rounded-button border border-border-subtle bg-surface-base/60 px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-disabled"
        >
          <PlayCircle className="h-4 w-4" /> Mic
        </button>
        <button
          onClick={startTabShare}
          disabled={actionsDisabled}
          className="inline-flex items-center gap-2 rounded-button border border-border-subtle bg-surface-base/60 px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-disabled"
        >
          <Monitor className="h-4 w-4" /> Tab Audio
        </button>
        <button
          onClick={pause}
          disabled={status !== "RECORDING"}
          className="inline-flex items-center gap-2 rounded-button border border-border-subtle px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent disabled:cursor-not-allowed disabled:text-text-disabled"
        >
          <PauseCircle className="h-4 w-4" /> Pause
        </button>
        <button
          onClick={resume}
          disabled={status !== "PAUSED"}
          className="inline-flex items-center gap-2 rounded-button border border-border-subtle px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent disabled:cursor-not-allowed disabled:text-text-disabled"
        >
          <PlayCircle className="h-4 w-4" /> Resume
        </button>
        <button
          onClick={stop}
          className="inline-flex items-center gap-2 rounded-button bg-status-error/90 px-4 py-2 text-sm font-semibold text-white shadow-surface transition hover:bg-status-error"
        >
          <Square className="h-4 w-4" /> Stop & Summarize
        </button>
      </div>

      {error && <p className="text-sm text-status-error">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-border-subtle bg-surface-panel/80 p-4 shadow-surface">
          <h2 className="font-display text-lg text-text-primary">Live transcription</h2>
          <div className="mt-4 flex min-h-[200px] flex-col gap-2 overflow-auto rounded-card border border-border-subtle/60 bg-surface-base/60 p-4 text-sm">
            {tokens.length === 0 && <p className="text-text-tertiary">Waiting for tokens...</p>}
            {tokens.map((token, idx) => (
              <p key={idx} className="text-text-secondary">
                {token}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-border-subtle bg-surface-panel/80 p-4 shadow-surface">
          <h2 className="font-display text-lg text-text-primary">Buffered transcript</h2>
          <div className="mt-4 min-h-[200px] space-y-2 overflow-auto rounded-card border border-border-subtle/60 bg-surface-base/60 p-4 text-sm">
            {transcript.length === 0 && <p className="text-text-tertiary">No transcript chunks yet.</p>}
            {transcript.map((line, idx) => (
              <p key={idx} className="text-text-secondary">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {summary && (
        <section className="rounded-card border border-brand-accent/30 bg-gradient-to-r from-brand-accent/20 to-brand-cyan/10 p-6 shadow-glow">
          <h2 className="font-display text-lg text-text-primary">AI Summary</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-text-primary/80">{summary}</p>
        </section>
      )}
    </div>
  );
}
