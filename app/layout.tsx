import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "ScribeAI",
  description: "Real-time AI meeting assistant built with Gemini",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
