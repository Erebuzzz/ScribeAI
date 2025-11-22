import { SiteNav } from "@/components/site-nav";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
      <SiteNav />
      <main className="flex-1 rounded-card border border-border-subtle bg-surface-panel/80 p-6 shadow-surface backdrop-blur">
        {children}
      </main>
      <footer className="rounded-card border border-border-subtle bg-surface-panel/70 p-4 text-xs text-text-secondary">
        <p>ScribeAI · Crafted with Next.js, Tailwind CSS, and the Gemini API.</p>
      </footer>
    </div>
  );
}
