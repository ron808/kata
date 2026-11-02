"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MaruMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import { focusChanged } from "@/components/focus/mode";
import { useClock } from "@/components/focus/useClock";
import { lasted } from "@/lib/missions/core";
import { reportOf, type Report } from "@/lib/missions/report";
import type { MissionT } from "@/lib/types";
import { AddTask, TaskList } from "./Tasks";
import { useMission } from "./useMission";

/** Maru's few sentences: written once, the first time the report is opened. */
function Take({ mission, name }: { mission: MissionT; name: string }) {
  const [take, setTake] = useState(mission.take);
  useEffect(() => {
    if (mission.take) return;
    let live = true;
    fetch(`/api/missions/${mission._id}/take`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { take?: string } | null) => {
        if (live && d?.take) setTake(d.take);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [mission._id, mission.take]);
  if (!take) return null;
  return (
    <div className="flex items-start gap-3">
      <MaruMark size={40} title={name} />
      <p className="bubble-kata appear max-w-[62ch] px-4 py-3 text-[1.0125rem] leading-snug">{take}</p>
    </div>
  );
}

/** Where the time went: worked out from the clocks, so it's what happened, not an impression. */
function TimeBars({ report }: { report: Report }) {
  if (!report.time.length) return null;
  return (
    <section aria-labelledby="report-time" className="card p-5 sm:p-6">
      <h2 id="report-time" className="font-display text-display-s">
        Where the time went
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-3.5">
        {report.time.map(({ task, ms, share, over }) => (
          <li key={task.id} data-hue={task.hue} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{task.title}</span>
              <span className="shrink-0 text-sm tabular-nums text-ink/70">
                {lasted(ms)}
                {task.minutes ? ` of ${task.minutes} min` : ""}
                {over ? " · over" : ""}
              </span>
            </div>
            <span aria-hidden className="mt-1.5 block h-2.5 overflow-clip rounded-full bg-ink/10">
              <span className="block h-full rounded-full bg-hue" style={{ width: `${Math.max(4, share * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Every step, in order: what got saved, for looking back. */
function History({ mission }: { mission: MissionT }) {
  if (!mission.log.length) return null;
  return (
    <details className="card p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold">What happened, step by step</summary>
      <ol className="mt-3 grid grid-cols-1 gap-1.5 text-[0.9375rem]">
        {mission.log.map((l, i) => (
          <li key={i} className="flex gap-3">
            <time dateTime={l.at} suppressHydrationWarning className="w-[4.5rem] shrink-0 tabular-nums text-ink/65">
              {new Date(l.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </time>
            <span className="min-w-0 [overflow-wrap:anywhere]">{l.text}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** A mission in the ordinary colours: all of it, with the report once it's over. */
export function MissionView({ mission: initial }: { mission: MissionT }) {
  const router = useRouter();
  const { toast } = useToast();
  const { name } = useCompanion();
  const { mission: m, act, busy } = useMission(initial);
  const now = useClock(m.now);
  const over = m.status !== "open";
  const report = reportOf(m, now);
  const [keeping, setKeeping] = useState(false);
  const [kept, setKept] = useState(false);
  const [sure, setSure] = useState(false);

  async function focus() {
    if (await act({ do: "focus" })) {
      focusChanged({ on: true });
      router.push("/focus");
      router.refresh();
    }
  }

  async function again() {
    const res = await fetch(`/api/missions/${m._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ do: "again" }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { mission?: MissionT } | null;
    if (!res?.ok || !data?.mission) {
      toast("That didn’t start. Try again.", "danger");
      return;
    }
    router.push(`/missions/${data.mission._id}`);
  }

  async function keep() {
    setKeeping(true);
    const res = await fetch(`/api/missions/${m._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ do: "keep" }) }).catch(() => null);
    setKeeping(false);
    if (res?.ok) {
      setKept(true);
      toast("Kept on your threads.");
    } else toast("That didn’t save. Try again.", "danger");
  }

  async function remove() {
    const res = await fetch(`/api/missions/${m._id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      toast("That didn’t go. Try again.", "danger");
      return;
    }
    router.push("/missions");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium text-ink/70">
            {over ? (m.status === "done" ? "Wrapped up" : "Dropped") : "Going"}
            {m.endsText && !over ? ` · ends ${m.endsText}` : ""}
          </p>
          <h1 className="mt-2 font-display text-display-m [overflow-wrap:anywhere]">{m.name}</h1>
          <p className="mt-3 text-lede text-ink/75">{report.total ? report.line : "Nothing on it yet."}</p>
        </div>
        {over ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" disabled={busy} onClick={focus}>
              <Icon name="target" className="h-5 w-5" />
              Focus
            </Button>
          </div>
        )}
      </header>

      {over ? <Take mission={m} name={name} /> : null}

      <section aria-label="Tasks" className="card p-3 sm:p-4">
        {m.tasks.length ? <TaskList tasks={m.tasks} now={now} act={act} busy={busy} readOnly={over} /> : <p className="p-3 text-ink/75">Add what’s on it, or ask {name}.</p>}
        {over ? null : (
          <div className="rule mt-3 border-t-2 pt-3">
            <AddTask id="mission-add" act={act} busy={busy} />
          </div>
        )}
      </section>

      {over ? <TimeBars report={report} /> : null}

      {over && report.left.length && !kept ? (
        <section className="well flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="min-w-0 text-[0.9375rem] [overflow-wrap:anywhere]">
            {report.left.length === 1 ? "One thing wasn’t finished" : `${report.left.length} things weren’t finished`}: {report.left.map((t) => t.title).join(", ")}.
          </p>
          <Button variant="secondary" size="sm" className="!h-11" disabled={keeping} onClick={keep}>
            Keep as threads
          </Button>
        </section>
      ) : null}

      <History mission={m} />

      <footer className="flex flex-wrap items-center gap-2">
        {over ? (
          <>
            <Button onClick={again}>
              <Icon name="refresh" className="h-4 w-4" />
              Run it again
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act({ do: "reopen" })}>
              Open it again
            </Button>
            {sure ? (
              <Button variant="danger" onClick={remove}>
                Delete for good
              </Button>
            ) : (
              <Button variant="quiet" onClick={() => setSure(true)}>
                Delete
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => act({ do: "finish" })}>
              Wrap it up
            </Button>
            <Button variant="quiet" disabled={busy} onClick={() => act({ do: "drop" })}>
              Drop it
            </Button>
          </>
        )}
      </footer>
    </div>
  );
}
