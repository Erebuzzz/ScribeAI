import Link from "next/link";
import { Brain, Mic, Waves } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="space-y-16">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/30 to-blue-600/20 p-10 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.5em] text-white/60">Attack Capital Assignment</p>
        <h1 className="mt-6 text-5xl font-semibold leading-tight">
          ScribeAI
          <span className="block text-2xl font-normal text-white/70">
            Streaming-first meeting intelligence powered by Gemini
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/80">
          Capture microphone and tab audio, stream it to Google Gemini for live transcripts, and receive
          structured summaries instantly. Built with Next.js 14, Better Auth, Prisma, and Socket.io for
          resilient, low-latency collaboration.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-105"
          >
            Launch dashboard
          </Link>
          <Link
            href="https://ai.google.dev/gemini-api"
            className="inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/80"
          >
            Gemini Docs
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            icon: Mic,
            title: "Dual-source capture",
            body: "Switch between microphone and tab-share audio via MediaRecorder timeslices for second-by-second streaming.",
          },
          {
            icon: Waves,
            title: "Resilient streaming",
            body: "Buffered Socket.io queues ensure Gemini throughput never drops chunks, even during 1-hour marathons.",
          },
          {
            icon: Brain,
            title: "AI-native summaries",
            body: "Gemini prompt templates extract key decisions, owners, and next steps the moment you stop recording.",
          },
        ].map((feature) => (
          <article key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <feature.icon className="h-10 w-10 text-accent" />
            <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-white/70">{feature.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
