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
        {children}
      </body>
    </html>
  );
}
