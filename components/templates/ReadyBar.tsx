"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";

/** After a page becomes yours: the way to today's page, until you dismiss it or leave. */
export function ReadyBar({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  const link = useRef<HTMLAnchorElement>(null);

  // The next step is writing: put focus on it, after the dialog has handed focus back.
  useEffect(() => {
    const id = requestAnimationFrame(() => link.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-margin lg:bottom-6 lg:left-[16.5rem]">
      <div
        role="status"
        className="appear pointer-events-auto flex w-full max-w-[36rem] flex-wrap items-center gap-x-3 gap-y-2.5 rounded-lg border-2 border-edge bg-ink p-2.5 pl-3.5 text-ground shadow-sticker-sm sm:flex-nowrap sm:rounded-full sm:py-2 sm:pl-2.5"
      >
        <Seal size={32} title="Saved" style={{ ["--seal-cut" as string]: "var(--ink)" }} />
        <p className="min-w-0 flex-1 text-[0.9375rem] font-medium leading-snug">
          <span className="font-semibold">{name}</span> is your daily page now.
        </p>
        <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
          <Link ref={link} href="/entry/new" className={buttonClass({ variant: "secondary", className: "flex-1 sm:flex-none" })}>
            Write your page
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ground/80 transition-colors hover:bg-ground/15 hover:text-ground"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
