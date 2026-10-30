"use client";

import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";

export interface OutlineItem {
  id: string;
  label: string;
  done: boolean;
  /** Kata's questions show their tag in its hue. */
  hue?: number;
}

function Row({ item, onJump }: { item: OutlineItem; onJump: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        title={item.label}
        onClick={() => onJump(item.id)}
        className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-[0.9375rem] transition-colors duration-300 hover:bg-ink/[0.05]"
      >
        <span
          aria-hidden
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-edge transition-colors duration-300 ${
            item.done ? "bg-sun text-on-sun" : "bg-surface"
          }`}
        >
          {item.done ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        {item.hue !== undefined ? (
          <span aria-hidden data-hue={item.hue} className="h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-edge bg-hue" />
        ) : null}
        <span className={`min-w-0 truncate ${item.done ? "text-ink" : "text-ink/75"}`}>{item.label}</span>
        <span className="sr-only">{item.done ? ", answered" : ", not answered yet"}</span>
      </button>
    </li>
  );
}

/** The page at a glance, beside it on wide screens: what's answered, and a way to jump there. */
export function PageOutline({
  fields,
  asks,
  words,
  onJump,
}: {
  fields: OutlineItem[];
  asks: OutlineItem[];
  words: number;
  onJump: (id: string) => void;
}) {
  const { name } = useCompanion();
  const total = fields.length + asks.length;
  const done = [...fields, ...asks].filter((i) => i.done).length;
  return (
    <nav aria-labelledby="outline-title" className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="outline-title" className="font-display text-[1.35rem] leading-none">
          On this page
        </h2>
        <span className="text-[0.8125rem] font-semibold tabular-nums text-ink/65">
          {done} of {total}
        </span>
      </div>
      <ol className="-mx-2 mt-3 grid grid-cols-1 gap-0.5">
        {fields.map((f) => (
          <Row key={f.id} item={f} onJump={onJump} />
        ))}
      </ol>
      {asks.length ? (
        <>
          <h3 className="mt-4 text-[0.875rem] font-semibold text-ink/70">{name} asks</h3>
          <ol className="-mx-2 mt-1.5 grid grid-cols-1 gap-0.5">
            {asks.map((a) => (
              <Row key={a.id} item={a} onJump={onJump} />
            ))}
          </ol>
        </>
      ) : null}
      <p className="rule mt-4 border-t-2 pt-3 text-[0.875rem] text-ink/70">
        <span className="font-display text-[1.15rem] tabular-nums text-ink">{words.toLocaleString("en-US")}</span>{" "}
        {words === 1 ? "word" : "words"} so far
      </p>
    </nav>
  );
}
