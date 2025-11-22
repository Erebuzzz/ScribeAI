import Link from "next/link";
import { Brain, Mic, Waves } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Dual-source capture",
    body: "Switch between mic and tab share via MediaRecorder timeslices. Every second of audio ships to Gemini in order.",
  },
  {
    icon: Waves,
    title: "Resilient streaming",
    body: "Buffered Socket.io queues smooth out weak connections so 60-minute meetings never lose a chunk.",
  },
  {
    icon: Brain,
    title: "AI-native summaries",
    body: "Gemini prompt stacks emit key decisions, owners, and action items as soon as you stop recording.",
  },
];

export default function LandingPage() {
  return (
    <main className="space-y-10">
      <section className="overflow-hidden rounded-card border border-border-subtle bg-surface-panel/90 p-10 shadow-surface">
        <div className="relative z-10 max-w-3xl space-y-6">
          <p className="text-xs uppercase tracking-[0.6em] text-text-secondary">Attack Capital Assignment</p>
          <h1 className="font-display text-5xl leading-tight text-text-primary">
            ScribeAI
            <span className="mt-2 block text-lg font-normal text-text-secondary">
              Streaming-first meeting intelligence powered by Gemini
            </span>
          </h1>
          <p className="text-base text-text-secondary">
            Capture microphone and tab audio, stream it to Google Gemini for live transcripts, and receive structured summaries
            instantly. Built with Next.js 14, Better Auth, Prisma, and Socket.io for resilient, low-latency collaboration.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-button bg-brand-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-hover"
            >
              Launch dashboard
            </Link>
            <Link
              href="https://ai.google.dev/gemini-api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-button border border-border-subtle px-6 py-3 text-sm font-semibold text-text-primary hover:border-brand-accent"
            >
              Gemini Docs
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-brand-accent/30 via-transparent to-brand-cyan/20" />
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-card border border-border-subtle bg-surface-raised/80 p-6 shadow-surface backdrop-blur"
          >
            <feature.icon className="h-10 w-10 text-brand-accent" />
            <h3 className="mt-4 font-display text-xl text-text-primary">{feature.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{feature.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
