"use client";

import Link from "next/link";
import { useState } from "react";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { KIND_LABEL, Status } from "@/components/shared/Status";
import { useToast } from "@/components/shared/Toast";
import type { ThreadT } from "@/lib/types";
import { metaWithToday, onYourMind, showsStatus, stepOn, stepsFor } from "./meta";
import { ThreadMap } from "./ThreadMap";

/** Change a thread and hand back the saved version. */
export async function patchThread(id: string, body: Record<string, unknown>): Promise<ThreadT> {
  const res = await fetch(`/api/threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { thread?: ThreadT; error?: string };
  if (!res.ok || !data.thread) throw new Error(data.error ?? "That didn’t save. Try again.");
  return data.thread;
}

/** The selected thread: what Kata knows, and the two things you'd change from here. */
export function ThreadNote({
  thread: t,
  today,
  tz,
  onChange,
}: {
  thread: ThreadT;
  today: string;
  tz: string;
  onChange: (t: ThreadT) => void;
}) {
  const { toast } = useToast();
  const { name } = useCompanion();
  const [saving, setSaving] = useState(false);

  async function save(body: Record<string, unknown>, optimistic: Partial<ThreadT>) {
    if (saving) return;
    setSaving(true);
    const before = t;
    onChange({ ...t, ...optimistic });
    try {
      onChange(await patchThread(t._id, body));
      if (body.status === "done") toast(t.kind === "habit" ? `${t.title}: done for today.` : `${t.title}: done. ${name} took it off your mind.`, "success");
    } catch (err) {
      onChange(before);
      toast(err instanceof Error ? err.message : "That didn’t save", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="well appear p-4" data-hue={t.hue % 8}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[1.6rem] leading-[0.95]">{t.title}</p>
        {showsStatus(t) ? <Status status={t.status} className="mt-1" /> : null}
      </div>
      <p className="mt-1.5 text-[0.8125rem] text-ink/65">
        {KIND_LABEL[t.kind]} · {metaWithToday(t, today, tz)}
      </p>
      {t.lastNote ? <p className="mt-3">{t.lastNote}</p> : null}
      {t.nextStep ? (
        <p className="mt-1.5 text-[0.9375rem]">
          <span className="text-ink/65">Next: </span>
          {t.nextStep}
        </p>
      ) : null}
      <div className="scale mt-4" role="group" aria-label={`Where ${t.title} is`}>
        {stepsFor(t.kind)
          .filter((s) => s.value !== "paused" || t.kind === "habit" || t.kind === "person")
          .map((s) => {
            const on = stepOn(t, s.value, today, tz);
            return (
              <button
                key={s.value}
                type="button"
                className="scale-step scale-row"
                aria-pressed={on}
                disabled={saving}
                onClick={() => !on && save({ status: s.value }, t.kind === "habit" && s.value === "done" ? {} : { status: s.value })}
              >
                {s.label}
              </button>
            );
          })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="chip chip-sm"
          aria-pressed={t.shared}
          disabled={saving}
          onClick={() => save({ shared: !t.shared }, { shared: !t.shared })}
        >
          {t.shared ? <Icon name="check" className="h-4 w-4" /> : <Icon name="eye" className="h-4 w-4" />}
          {t.shared ? "On your profile" : "Show on my profile"}
        </button>
        <Link href={`/threads?t=${t._id}`} className="link inline-flex min-h-11 items-center text-[0.875rem] font-semibold">
          Open thread
        </Link>
      </div>
    </div>
  );
}

/** "On your mind": the map of what Kata is keeping track of, and the selected thread. */
export function MindCard({
  threads,
  today,
  tz,
  onChange,
}: {
  threads: ThreadT[];
  today: string;
  tz: string;
  onChange: (t: ThreadT) => void;
}) {
  const { name } = useCompanion();
  const mind = onYourMind(threads);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = mind.find((t) => t._id === picked) ?? mind[0] ?? null;

  return (
    <section aria-labelledby="mind-heading" className="card p-4 sm:p-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 id="mind-heading" className="font-display text-display-s">
            On your mind
          </h2>
          <p className="mt-1.5 text-[0.875rem] text-ink/65">What {name} is keeping track of for you.</p>
        </div>
        <Link href="/threads" className="link inline-flex min-h-11 shrink-0 items-center text-[0.875rem] font-semibold">
          All threads
        </Link>
      </header>
      <div className="-mx-1 mt-4 sm:mx-0">
        <ThreadMap threads={mind} selected={selected?._id ?? null} onSelect={setPicked} today={today} tz={tz} />
      </div>
      <div className="mt-4">
        {selected ? (
          <ThreadNote key={selected._id} thread={selected} today={today} tz={tz} onChange={onChange} />
        ) : (
          <div className="well p-4 text-[0.9375rem] text-ink/75">
            Nothing on the map yet. Tell {name} what you’re working on, or{" "}
            <Link href="/threads" className="link font-semibold text-ink">
              add a thread
            </Link>
            .
          </div>
        )}
      </div>
    </section>
  );
}
