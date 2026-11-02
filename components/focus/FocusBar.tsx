"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KataMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";
import { clock, focusedFor } from "@/lib/missions/core";
import type { FocusState } from "@/lib/types";
import { focusChanged } from "./mode";
import { useClock } from "./useClock";

/** The whole thing's clock: counting down to when it ends, or up from when focus began. */
function WholeClock({ focus }: { focus: FocusState }) {
  const now = useClock(focus.now);
  const ends = focus.endsAt ? Date.parse(focus.endsAt) : null;
  const left = ends === null ? null : ends - now;
  const shown = left === null ? focusedFor(focus, now) : Math.abs(left);
  const label = left === null ? "in focus" : left >= 0 ? "left" : "over";
  return (
    <p role="timer" className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">
      {clock(shown)} <span className="font-medium text-ink/65">{label}</span>
    </p>
  );
}

/** All that's left of the app's chrome while focus is on: what it's on, the time, and the way out. */
export function FocusBar({ focus }: { focus: FocusState | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [stopping, setStopping] = useState(false);

  async function stop() {
    if (!focus || stopping) return;
    setStopping(true);
    const res = await fetch(`/api/missions/${focus.missionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ do: "unfocus" }),
    }).catch(() => null);
    setStopping(false);
    if (!res?.ok) {
      toast("Focus didn’t stop. Try again.", "danger");
      return;
    }
    focusChanged({ on: false });
    router.push(`/missions/${focus.missionId}`);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-ground/92 px-margin backdrop-blur-md">
      <Link href="/focus" aria-label="Back to focus" className="-mx-1 flex min-h-11 shrink-0 items-center px-1">
        <KataMark size={30} cut="ground" />
      </Link>
      <p className="min-w-0 flex-1 truncate font-semibold max-xs:hidden">{focus?.name ?? "Focus"}</p>
      <span className="max-xs:flex-1">{focus ? <WholeClock focus={focus} /> : null}</span>
      <Button variant="secondary" size="sm" className="!h-11 shrink-0" onClick={stop} disabled={stopping || !focus}>
        {stopping ? "Stopping…" : "Stop focus"}
      </Button>
    </header>
  );
}
