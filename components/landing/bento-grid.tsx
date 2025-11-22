"use client";

import React, { useRef, useState } from "react";
import { Mic, Waves, Brain, Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden bg-surface-panel border border-border-subtle shadow-surface transition-all duration-300 hover:shadow-glow/20 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(99, 91, 255, 0.15), transparent 40%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
};

export const BentoGrid = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto p-4"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {/* Hero Card - Spans 2 cols on desktop */}
      <SpotlightCard className="md:col-span-2 md:row-span-2 min-h-[400px] flex flex-col justify-center p-8 group">
        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
          <Mic className="w-32 h-32 text-brand-accent" />
        </div>
        <div className="relative z-10 space-y-6">
          <motion.div 
            className="inline-flex items-center space-x-2 px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-medium uppercase tracking-wider w-fit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span>Attack Capital Assignment</span>
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-text-primary leading-tight">
            Capture. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-cyan">
              Transcribe.
            </span>{" "}
            <br />
            Summarize.
          </h2>
          <p className="text-lg text-text-secondary max-w-md">
            Streaming-first meeting intelligence powered by Gemini. 
            Dual-source capture for crystal clear audio and instant AI summaries.
          </p>
        </div>
      </SpotlightCard>

      {/* Feature 1: Real-time */}
      <SpotlightCard className="p-6 flex flex-col justify-between group">
        <div className="mb-4 p-3 bg-surface-raised w-fit border border-border-subtle group-hover:border-brand-accent/50 transition-colors">
          <Zap className="w-6 h-6 text-brand-cyan" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-text-primary mb-2">Real-time Speed</h3>
          <p className="text-sm text-text-secondary">
            Low-latency streaming via Socket.io ensures you never miss a beat.
          </p>
        </div>
      </SpotlightCard>

      {/* Feature 2: Dual Source */}
      <SpotlightCard className="p-6 flex flex-col justify-between group">
        <div className="mb-4 p-3 bg-surface-raised w-fit border border-border-subtle group-hover:border-brand-accent/50 transition-colors">
          <Waves className="w-6 h-6 text-brand-soft" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-text-primary mb-2">Dual-Source</h3>
          <p className="text-sm text-text-secondary">
            Simultaneous mic and tab audio capture for complete context.
          </p>
        </div>
      </SpotlightCard>

      {/* Feature 3: AI Powered */}
      <SpotlightCard className="md:col-span-2 p-8 flex items-center justify-between group overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="mb-4 p-3 bg-surface-raised w-fit border border-border-subtle group-hover:border-brand-accent/50 transition-colors">
            <Brain className="w-6 h-6 text-brand-accent" />
          </div>
          <h3 className="text-2xl font-display font-bold text-text-primary mb-2">Gemini AI Powered</h3>
          <p className="text-text-secondary">
            Advanced prompt stacks analyze your meetings to extract key decisions, action items, and owners instantly.
          </p>
        </div>
        <motion.div 
          className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        >
           <Brain className="w-64 h-64 text-brand-accent" />
        </motion.div>
      </SpotlightCard>

      {/* Feature 4: Secure */}
      <SpotlightCard className="p-6 flex flex-col justify-between group">
        <div className="mb-4 p-3 bg-surface-raised w-fit border border-border-subtle group-hover:border-brand-accent/50 transition-colors">
          <Shield className="w-6 h-6 text-status-success" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-text-primary mb-2">Secure & Private</h3>
          <p className="text-sm text-text-secondary">
            Your data is processed securely with enterprise-grade standards.
          </p>
        </div>
      </SpotlightCard>
    </motion.div>
  );
};