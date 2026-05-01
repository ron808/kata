"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

function FakeContribution() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cells = useMemo(() => {
    if (!mounted) return new Array(7 * 26).fill(0);
    const out: number[] = [];
    for (let i = 0; i < 7 * 26; i++) {
      out.push(Math.random() < 0.55 ? Math.floor(Math.random() * 5) : 0);
    }
    return out;
  }, [mounted]);

  const cols: number[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  const colors = [
    "rgba(255,236,210,0.06)",
    "rgba(232,160,92,0.25)",
    "rgba(232,160,92,0.5)",
    "rgba(232,160,92,0.75)",
    "rgba(232,160,92,1)",
  ];
  return (
    <div className="flex gap-[3px]" aria-hidden suppressHydrationWarning>
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((level, ri) => (
            <div
              key={ri}
              className="w-[10px] h-[10px] rounded-[2px] transition-colors duration-700"
              style={{ background: colors[level] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FeatureHighlights() {
  return (
    <section className="py-32 px-6 border-t border-border/60">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono mb-3">
            Three quiet things
          </div>
          <h2 className="font-serif italic text-5xl md:text-6xl tracking-tight leading-[1.02]">
            Built for the slow,<br/>good kind of habit.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-border/40 rounded-[4px] overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="bg-bg-base p-8 md:col-span-2"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono">
              I. Contribution graph
            </div>
            <h3 className="font-serif italic text-3xl mt-3 leading-tight">
              Your year of writing — one square at a time.
            </h3>
            <p className="text-text-secondary mt-3 max-w-md text-[15px] leading-[1.7]">
              Watch your habit emerge. Hover any day to see what you wrote.
            </p>
            <div className="mt-8 overflow-hidden">
              <FakeContribution />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="bg-bg-base p-8"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono">
              II. Component builder
            </div>
            <h3 className="font-serif italic text-3xl mt-3 leading-tight">
              Drag, drop, done.
            </h3>
            <p className="text-text-secondary mt-3 text-[15px] leading-[1.7]">
              Ten field types. Build the daily form that fits how you actually work.
            </p>
            <div className="mt-6 space-y-2">
              {[
                { i: "≡", l: "Long text" },
                { i: "⚡", l: "Energy level" },
                { i: "▦", l: "Tags" },
                { i: "★", l: "Rating" },
              ].map((b) => (
                <div
                  key={b.i}
                  className="flex items-center gap-3 border-b border-border/60 py-2 text-sm"
                >
                  <span className="grid place-items-center w-7 h-7 text-accent font-mono text-base">
                    {b.i}
                  </span>
                  <span className="text-text-primary/90">{b.l}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-bg-base p-10 md:col-span-3 relative overflow-hidden"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono">
              III. Weekly digest · Sunday 9pm
            </div>
            <h3 className="font-serif italic text-3xl md:text-4xl mt-3 leading-tight">
              A quiet, honest summary of your week.
            </h3>
            <p className="font-serif text-text-primary mt-6 leading-[1.85] max-w-3xl text-[18px] blur-[2px] hover:blur-0 transition-all duration-700">
              <span className="float-left font-serif italic text-6xl leading-[0.85] mr-2 mt-1 text-accent">T</span>
              his week looked like a lot of bridge-building. You shipped two
              features and started three more — but the recurring word in your
              entries was &ldquo;blocked.&rdquo; You moved through it anyway, and
              on Thursday something clicked. The pattern I&apos;d watch: your
              energy was lowest on the days you skipped your morning plan. Maybe
              tomorrow start with that.
            </p>
            <p className="text-[11px] text-text-muted font-mono mt-6 uppercase tracking-[0.22em]">
              Hover to reveal — your real digests are private.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
