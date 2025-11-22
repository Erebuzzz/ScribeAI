"use client";

import { Monitor, PauseCircle, PlayCircle, RotateCcw, Square, Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAudioStream, type RecorderStatus } from "@/hooks/useAudioStream";

interface SessionRecorderProps {
  sessionId: string;
  userId: string;
  title: string;
  initialSummary?: string | null;
  initialTranscript?: string[];
  initialStatus?: RecorderStatus;
}

/**
 * Client component that wires UI controls to the streaming hook.
 */
export function SessionRecorder({
  sessionId,
  userId,
  title,
  initialSummary,
  initialTranscript,
  initialStatus = "IDLE",
}: SessionRecorderProps) {
  const {
    startMicrophone,
    startTabShare,
    pause,
    resume,
    stop,
    reset,
    status,
    transcript,
    tokens,
    summary,
    error,
    micActive,
    tabActive,
  } = useAudioStream({ sessionId, userId, initialStatus });

  const [fallbackTranscript, setFallbackTranscript] = useState<string[]>(initialTranscript ?? []);
  const [fallbackSummary, setFallbackSummary] = useState<string>(initialSummary ?? "");

  useEffect(() => {
    setFallbackTranscript(initialTranscript ?? []);
  }, [initialTranscript]);

  useEffect(() => {
    setFallbackSummary(initialSummary ?? "");
  }, [initialSummary]);

  const actionsDisabled = useMemo(() => status === "PROCESSING", [status]);
  const bufferedTranscript = transcript.length > 0 ? transcript : fallbackTranscript;
  const renderedSummary = summary ?? fallbackSummary;
  const hasSummary = renderedSummary.trim().length > 0;
  const indicatorClass = (active: boolean) =>
    `h-2 w-2 rounded-full ${active ? "bg-status-success" : "bg-status-error/80"}`;

  const handleRestart = useCallback(() => {
    reset();
    setFallbackTranscript([]);
    setFallbackSummary("");
  }, [reset]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <section className="space-y-6">
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
            <PlayCircle className="h-4 w-4" />
            <span>Mic</span>
            <span className={indicatorClass(micActive)} aria-label={micActive ? "Microphone active" : "Microphone off"} />
          </button>
          <button
            onClick={startTabShare}
            disabled={actionsDisabled}
            className="inline-flex items-center gap-2 rounded-button border border-border-subtle bg-surface-base/60 px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-disabled"
          >
            <Monitor className="h-4 w-4" />
            <span>Tab Audio</span>
            <span className={indicatorClass(tabActive)} aria-label={tabActive ? "Tab share active" : "Tab share off"} />
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
          <button
            onClick={handleRestart}
            disabled={status === "RECORDING" || status === "PROCESSING"}
            className="inline-flex items-center gap-2 rounded-button border border-border-subtle bg-surface-base/60 px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-disabled"
          >
            <RotateCcw className="h-4 w-4" /> Restart session
          </button>
          <a
            href={`/api/session/${sessionId}/transcript`}
            download
            className={`inline-flex items-center gap-2 rounded-button border border-border-subtle bg-surface-base/60 px-4 py-2 text-sm text-text-primary transition hover:border-brand-accent ${
              !hasSummary ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Download className="h-4 w-4" /> Export
          </a>
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
              {bufferedTranscript.length === 0 && <p className="text-text-tertiary">No transcript chunks yet.</p>}
              {bufferedTranscript.map((line, idx) => (
                <p key={idx} className="text-text-secondary">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </section>
      </section>

      <aside className="space-y-4">
        <section className="rounded-card border border-brand-accent/30 bg-gradient-to-r from-brand-accent/20 to-brand-cyan/10 p-6 shadow-glow">
          <h2 className="font-display text-lg text-text-primary">AI Summary</h2>
          {hasSummary ? (
            <p className="mt-3 whitespace-pre-line text-sm text-text-primary/80">{renderedSummary}</p>
          ) : (
            <p className="mt-3 text-sm text-text-tertiary">Summary will appear after you stop recording.</p>
          )}
        </section>
      </aside>
    </div>
  );
}