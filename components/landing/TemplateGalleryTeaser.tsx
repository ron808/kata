"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const SAMPLES = [
  {
    name: "Indie Dev Daily",
    author: "marc",
    description:
      "What I shipped, what broke, what I'm tinkering with — for one-person studios.",
    tags: ["productivity", "tech"],
    cloneCount: 1283,
  },
  {
    name: "Studio Rituals",
    author: "lin",
    description:
      "Mood, references, and the question I'm chasing this week. For designers.",
    tags: ["creative"],
    cloneCount: 942,
  },
  {
    name: "Founder's Field Notes",
    author: "sam",
    description:
      "Decisions, deferrals, conversations, risks — a daily debrief for builders.",
    tags: ["leadership", "productivity"],
    cloneCount: 2104,
  },
];

export function TemplateGalleryTeaser() {
  return (
    <section className="py-32 px-6 border-t border-border/60">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-12 gap-10 items-end mb-12">
          <div className="md:col-span-8">
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono mb-3">
              Chapter IV · Gallery
            </div>
            <h2 className="font-serif text-5xl md:text-6xl tracking-tight leading-[1.02]">
              Steal someone&apos;s <em className="text-accent">ritual</em>.
            </h2>
            <p className="text-text-secondary mt-5 max-w-lg text-[16px] leading-[1.7]">
              People publish the daily forms that keep them honest. Clone any
              of them — every field is yours to edit afterwards.
            </p>
          </div>
          <Link
            href="/register"
            className="md:col-span-4 md:justify-self-end text-base font-mono text-accent hover:text-accent-hover inline-flex items-center gap-2"
          >
            Browse the whole gallery <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border/40 rounded-[4px] overflow-hidden">
          {SAMPLES.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="bg-bg-base p-7 group cursor-pointer"
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono mb-3 flex items-center justify-between">
                <span>№ 0{i + 1}</span>
                <span>↻ {s.cloneCount.toLocaleString()}</span>
              </div>
              <h3 className="font-serif italic text-3xl leading-tight group-hover:text-accent transition-colors">
                {s.name}
              </h3>
              <p className="text-[15px] text-text-secondary leading-[1.7] mt-3">
                {s.description}
              </p>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/60">
                <div className="flex gap-3">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] uppercase tracking-[0.18em] text-accent font-mono"
                    >
                      · {t}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] text-text-muted font-mono">
                  @{s.author}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
