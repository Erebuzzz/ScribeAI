import "./globals.css";
import type { ReactNode } from "react";
import { Inter, Inter_Tight } from "next/font/google";

import { SiteNav } from "@/components/site-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });

export const metadata = {
  title: "ScribeAI",
  description: "Real-time AI meeting assistant built with Gemini",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${interTight.variable} min-h-screen bg-surface-base text-text-primary antialiased`}
      >
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
          <SiteNav />
          <main className="flex-1 rounded-card border border-border-subtle bg-surface-panel/80 p-6 shadow-surface backdrop-blur">
            {children}
          </main>
          <footer className="rounded-card border border-border-subtle bg-surface-panel/70 p-4 text-xs text-text-secondary">
            <p>ScribeAI · Crafted with Next.js, Tailwind CSS, and the Gemini API.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
