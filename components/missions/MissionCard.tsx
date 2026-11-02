"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import { focusChanged } from "@/components/focus/mode";
import { nextUp, tally } from "@/lib/missions/core";
import { reportOf } from "@/lib/missions/report";
import type { MissionT } from "@/lib/types";

/** A mission that's going: how far along it is, what's next, and the way into focus. */
export function MissionCard({ mission: m }: { mission: MissionT }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const { done, total } = tally(m.tasks);
  const up = nextUp(m.tasks, Date.parse(m.now));

  async function focus() {
    setBusy(true);
    const res = await fetch(`/api/missions/${m._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ do: "focus" }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      toast("Focus didn’t start. Try again.", "danger");
      return;
    }
    focusChanged({ on: true });
    router.push("/focus");
    router.refresh();
  }

  return (
    <article className="card flex flex-wrap items-center gap-x-5 gap-y-3 p-4 sm:px-5">
      <div className="min-w-0 flex-1 basis-56">
        <h2 className="font-display text-display-s [overflow-wrap:anywhere]">
          <Link href={`/missions/${m._id}`} className="hover:underline">
            {m.name}
          </Link>
        </h2>
        <p className="mt-1 text-[0.9375rem] text-ink/75 [overflow-wrap:anywhere]">
          {total ? `${done} of ${total} done` : "Nothing on it yet"}
          {up ? ` · next: ${up.title}${up.atText ? ` at ${up.atText}` : ""}` : ""}
        </p>
      </div>
      <Button disabled={busy} onClick={focus}>
        <Icon name="target" className="h-4 w-4" />
        Focus
      </Button>
    </article>
  );
}

/** A finished one, in a line, with the way to run it again. */
export function PastMission({ mission: m }: { mission: MissionT }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function again() {
    setBusy(true);
    const res = await fetch(`/api/missions/${m._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ do: "again" }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { mission?: MissionT } | null;
    setBusy(false);
    if (!res?.ok || !data?.mission) {
      toast("That didn’t start. Try again.", "danger");
      return;
    }
    router.push(`/missions/${data.mission._id}`);
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <Link href={`/missions/${m._id}`} className="font-semibold hover:underline [overflow-wrap:anywhere]">
          {m.name}
        </Link>
        <p className="text-[0.875rem] text-ink/70">
          {m.status === "dropped" ? "Dropped · " : ""}
          {reportOf(m).line}
        </p>
      </div>
      <button type="button" className="chip chip-sm" disabled={busy} onClick={again}>
        <Icon name="refresh" className="h-3.5 w-3.5" />
        Run it again
      </button>
    </li>
  );
}
