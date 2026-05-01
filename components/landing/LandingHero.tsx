"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 glow-radial pointer-events-none" />
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <div className="relative max-w-5xl mx-auto px-6 pt-28 md:pt-36 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-text-muted font-mono mb-10"
        >
          <span className="numeral text-accent text-xl not-italic md:not-italic">№</span>
          <span>volume one · the daily journal</span>
          <span className="flex-1 rule-fine" />
          <span className="hidden md:inline">est. 2026</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-serif text-[64px] md:text-[112px] leading-[0.95] tracking-tight"
        >
          A journal that&nbsp;
          <em className="text-accent">writes back</em>
          <br className="hidden md:block" />
          {" "}to you on Sundays.
        </motion.h1>

        <div className="mt-12 grid md:grid-cols-12 gap-8 items-end">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-7 text-text-secondary text-[18px] leading-[1.65] max-w-2xl"
          >
            <span className="dropcap">K</span>ata is a daily journal that adapts to who you are.
            Build the form that fits your work — a sentence, a mood, a tag, a
            number — write a little each day, and let the patterns surface.
            Every Sunday, a small, honest letter comes back to you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-5 flex flex-col gap-3"
          >
            <Link
              href="/register"
              className="group inline-flex items-center justify-between gap-2 bg-accent text-bg-base text-base font-medium px-6 py-4 rounded-md btn-glow hover:bg-accent-hover transition-colors"
            >
              <span>Start your first entry</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-between gap-2 border border-border-strong text-text-primary hover:border-accent hover:text-accent text-base font-medium px-6 py-4 rounded-md transition-colors"
            >
              <span>Read how it works</span>
              <span aria-hidden>↓</span>
            </Link>
            <p className="text-[11px] text-text-muted font-mono uppercase tracking-[0.22em] mt-1">
              Free. No card. Built to be quiet.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-24 grid grid-cols-3 md:grid-cols-6 gap-px bg-border/40 rounded-[4px] overflow-hidden text-center"
        >
          {[
            ["10", "field types"],
            ["6", "role presets"],
            ["1", "entry per day"],
            ["52", "weeks tracked"],
            ["2", "AI digests"],
            ["∞", "your patterns"],
          ].map(([num, label]) => (
            <div key={label} className="bg-bg-base py-6 px-4">
              <div className="font-serif italic text-4xl text-accent">{num}</div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mt-2">
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
