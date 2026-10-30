"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/shared/Icon";
import { HomeDesktop, HomePhone } from "./HomeMock";
import { LOOKS, type LookId, type Mode } from "./data";
import "./looks.css";

const DESIGN_WIDTH = 1280;

/**
 * The same new home screen in three candidate looks, on a phone at real size and in a
 * desktop window scaled to fit. Pick a look at the top; each remembers its own light or dark.
 */
export function LooksPreview({ first, date }: { first: string; date: string }) {
  const [look, setLook] = useState<LookId>("sticker");
  const [modes, setModes] = useState<Record<LookId, Mode>>(
    () => Object.fromEntries(LOOKS.map((l) => [l.id, l.mode])) as Record<LookId, Mode>
  );
  const mode = modes[look];
  const current = LOOKS.find((l) => l.id === look)!;

  return (
    <div className="min-h-svh bg-[#e6e4df] text-[#1c1b19]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#e6e4df]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/lab" className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-[0.9375rem] text-black/70 hover:text-black">
            <Icon name="arrow-left" className="h-4 w-4" />
            The Lab
          </Link>
          <div role="radiogroup" aria-label="Look" className="flex flex-wrap gap-1 rounded-[14px] bg-black/[0.06] p-1">
            {LOOKS.map((l, i) => {
              const on = l.id === look;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLook(l.id)}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-medium transition-colors duration-300 ${
                    on ? "bg-white text-black shadow-sm" : "text-black/65 hover:text-black"
                  }`}
                >
                  <span className="tabular-nums text-black/40">{i + 1}</span>
                  {l.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setModes((m) => ({ ...m, [look]: mode === "dark" ? "light" : "dark" }))}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-black/15 px-4 text-[0.9375rem] font-medium text-black/75 hover:text-black"
            aria-label={`Switch ${current.name} to ${mode === "dark" ? "light" : "dark"} mode`}
          >
            <Icon name={mode === "dark" ? "moon" : "sun"} className="h-4 w-4" />
            {mode === "dark" ? "Dark" : "Light"}
          </button>
          <p className="text-[0.9375rem] text-black/65 lg:ml-auto">
            <span className="font-medium text-black">{current.name}.</span> {current.line}
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-[110rem] flex-wrap items-start justify-center gap-8 px-4 py-8 sm:px-6">
        <Phone>
          <div className="lk-root min-h-full" data-look={look} data-mode={mode}>
            <HomePhone key={look} look={look} first={first} date={date} />
          </div>
        </Phone>
        <Desktop>
          <div className="lk-root" data-look={look} data-mode={mode}>
            <HomeDesktop key={look} look={look} first={first} date={date} />
          </div>
        </Desktop>
      </main>
      <p className="px-4 pb-10 text-center text-[0.875rem] text-black/60">
        Demo people and threads. Tap the replies, the map and the reactions: they respond.
      </p>
    </div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <figure className="w-[390px] max-w-full shrink-0">
      <div className="overflow-hidden rounded-[46px] border-[9px] border-[#111] bg-[#111] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.45)]">
        <div className="h-[min(820px,calc(100svh-9rem))] overflow-y-auto overscroll-contain rounded-[37px] [scrollbar-width:none]">
          {children}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[0.875rem] text-black/60">Phone, actual size</figcaption>
    </figure>
  );
}

/** A desktop window at 1280 wide, scaled to the room it has. */
function Desktop({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const scale = Math.min(1, o.clientWidth / DESIGN_WIDTH);
      setFit({ scale, height: i.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <figure className="min-w-0 max-w-[1280px] grow basis-[640px]">
      <div className="overflow-hidden rounded-[14px] border border-black/15 bg-[#f7f6f3] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.4)]">
        <div className="flex h-9 items-center gap-2 border-b border-black/10 px-3.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="mx-auto rounded-md bg-black/[0.06] px-10 py-0.5 text-[12px] text-black/55">kata.app</span>
        </div>
        <div ref={outer} className="relative overflow-clip" style={{ height: fit?.height ?? 600 }}>
          <div
            ref={inner}
            style={{
              width: DESIGN_WIDTH,
              transform: `scale(${fit?.scale ?? 0.5})`,
              transformOrigin: "0 0",
              opacity: fit ? 1 : 0,
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[0.875rem] text-black/60">Desktop, 1280 wide{fit && fit.scale < 1 ? `, shown at ${Math.round(fit.scale * 100)}%` : ""}</figcaption>
    </figure>
  );
}
