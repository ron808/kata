"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { FormAlert } from "@/components/shared/TextField";
import type { BreakdownT } from "@/lib/types";

const QUICK: [label: string, period: string][] = [
  ["This week so far", "this week"],
  ["Last week", "last week"],
  ["This month", "this month"],
  ["Last month", "last month"],
  ["This year", "this year"],
];

/** Breaks down a stretch without asking Maru: the usual ones are a tap, anything else in words. */
export function MakeBreakdown() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function make(period: string) {
    setBusy(period);
    setError("");
    const res = await fetch("/api/breakdowns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ period }),
    }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { breakdown?: BreakdownT; error?: string };
    if (!res?.ok || !data.breakdown) {
      setBusy(null);
      setError(data.error ?? "That didn’t work. Try again.");
      return;
    }
    router.push(`/breakdowns/${data.breakdown._id}`);
  }

  return (
    <section aria-labelledby="make-breakdown" className="card p-5 sm:p-6">
      <h2 id="make-breakdown" className="font-display text-display-s">
        Break down a stretch
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map(([label, period]) => (
          <button key={period} type="button" className="chip" disabled={busy !== null} aria-busy={busy === period} onClick={() => make(period)}>
            {busy === period ? "Working it out…" : label}
          </button>
        ))}
      </div>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) make(text.trim());
        }}
      >
        <label htmlFor="any-stretch" className="sr-only">
          Any other stretch
        </label>
        <input
          id="any-stretch"
          className="control min-w-0 flex-1"
          placeholder="Or any stretch: September, since Oct 3"
          value={text}
          maxLength={80}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!text.trim() || busy !== null}>
          Break it down
        </Button>
      </form>
      {error ? (
        <div className="mt-3">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}
    </section>
  );
}
