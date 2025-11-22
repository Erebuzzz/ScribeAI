"use client";

import Link from "next/link";
import Image from "next/image";
import { BentoGrid } from "@/components/landing/bento-grid";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <motion.header 
        className="w-full border-b border-border-subtle bg-surface-panel/50 backdrop-blur-md sticky top-0 z-50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Image src="/logo.svg" alt="ScribeAI Logo" width={150} height={40} className="h-10 w-auto" priority />
          </div>
          <div className="flex items-center gap-6">
             <Link
              href="https://ai.google.dev/gemini-api"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white transition-all bg-brand-accent hover:bg-brand-hover shadow-glow hover:shadow-glow/50"
            >
              Launch App
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="flex-1 py-12">
        <BentoGrid />
      </main>
      
      <motion.footer 
        className="border-t border-border-subtle py-8 bg-surface-panel mt-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto px-4 text-center text-text-tertiary text-sm">
          <p>© 2025 ScribeAI. Powered by Google Gemini.</p>
        </div>
      </motion.footer>
    </div>
  );
}
