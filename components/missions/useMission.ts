"use client";

import { useState } from "react";
import { useToast } from "@/components/shared/Toast";
import type { MissionChange } from "@/lib/missions/schemas";
import type { MissionT } from "@/lib/types";

/**
 * A mission on the page: everything it does goes through one route and comes back as the
 * mission after it. New props (Maru changed something) replace what's here.
 */
export function useMission(initial: MissionT) {
  const { toast } = useToast();
  const [mission, setMission] = useState(initial);
  const [seen, setSeen] = useState(initial.now);
  const [busy, setBusy] = useState(false);
  if (initial.now !== seen) {
    setSeen(initial.now);
    setMission(initial);
  }

  async function act(change: MissionChange): Promise<MissionT | null> {
    setBusy(true);
    try {
      const res = await fetch(`/api/missions/${mission._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      const data = (await res.json().catch(() => ({}))) as { mission?: MissionT; error?: string };
      if (!res.ok || !data.mission) throw new Error(data.error ?? "That didn’t save. Try again.");
      setMission(data.mission);
      return data.mission;
    } catch (err) {
      toast(err instanceof Error ? err.message : "That didn’t save. Try again.", "danger");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { mission, act, busy };
}
