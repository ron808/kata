"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import { focusChanged } from "@/components/focus/mode";
import type { MissionT } from "@/lib/types";

const LENGTHS = ["25 min", "1 hour", "2 hours"];

/** A new mission, without going through Maru: one task a line, times in plain words. */
export function NewMission() {
  const router = useRouter();
  const { toast } = useToast();
  const { name } = useCompanion();
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState("");
  const [until, setUntil] = useState("");
  const [saving, setSaving] = useState<"make" | "focus" | null>(null);

  async function make(focus: boolean) {
    setSaving(focus ? "focus" : "make");
    const res = await fetch("/api/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        tasks: tasks.split(/\n+/).map((t) => t.trim()).filter(Boolean),
        ...(until.trim() ? { until: until.trim() } : {}),
        focus,
      }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { mission?: MissionT; error?: string } | null;
    setSaving(null);
    if (!res?.ok || !data?.mission) {
      toast(data?.error ?? "That didn’t save. Try again.", "danger");
      return;
    }
    if (focus) {
      focusChanged({ on: true });
      router.push("/focus");
      router.refresh();
    } else router.push(`/missions/${data.mission._id}`);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void make(false);
  }

  const ready = Boolean(tasks.trim());

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-4 p-5 sm:p-6">
      <div className="min-w-0">
        <label htmlFor="mission-tasks" className="mb-2 block text-[0.9375rem] font-semibold">
          What’s on it
        </label>
        <textarea
          id="mission-tasks"
          rows={4}
          className="control min-h-28 resize-y"
          placeholder={"Gym at 6pm for 45 min\nTaxes\nCall mum at 7"}
          value={tasks}
          onChange={(e) => setTasks(e.target.value)}
        />
        <p className="mt-2 text-sm text-ink/65">One a line. Say a time and how long in plain words, or tell {name}.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="mission-name" className="mb-2 block text-[0.9375rem] font-semibold">
            Name <span className="font-normal text-ink/65">if it’s not just for today</span>
          </label>
          <input id="mission-name" className="control" maxLength={80} autoComplete="off" placeholder="Exam week" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="min-w-0">
          <label htmlFor="mission-until" className="mb-2 block text-[0.9375rem] font-semibold">
            For how long <span className="font-normal text-ink/65">if you want a clock on it</span>
          </label>
          <input id="mission-until" className="control" maxLength={40} autoComplete="off" placeholder="2 hours, until 6pm" value={until} onChange={(e) => setUntil(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Lengths">
            {LENGTHS.map((l) => (
              <button key={l} type="button" className="chip chip-sm" aria-pressed={until === l} onClick={() => setUntil(until === l ? "" : l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={Boolean(saving) || (!ready && !until.trim())} onClick={() => make(true)}>
          <Icon name="target" className="h-4 w-4" />
          {saving === "focus" ? "Starting…" : "Start and focus"}
        </Button>
        <Button type="submit" variant="secondary" disabled={Boolean(saving) || !ready}>
          {saving === "make" ? "Saving…" : "Just make the list"}
        </Button>
      </div>
    </form>
  );
}
