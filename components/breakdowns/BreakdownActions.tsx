"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import type { BreakdownT } from "@/lib/types";

const goes = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });

/** An asked breakdown goes after thirty days unless kept; it can also be deleted. */
export function BreakdownActions({ id, expiresAt, tz }: { id: string; expiresAt: string | null; tz: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [until, setUntil] = useState(expiresAt);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const kept = until === null;

  async function keep(next: boolean) {
    setBusy(true);
    const res = await fetch(`/api/breakdowns/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keep: next }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      toast("That didn’t save. Try again.", "danger");
      return;
    }
    const data = (await res.json()) as { breakdown: BreakdownT };
    setUntil(data.breakdown.expiresAt);
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/breakdowns/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      toast("That didn’t delete. Try again.", "danger");
      return;
    }
    toast("Breakdown deleted.");
    router.push("/breakdowns");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="mr-auto text-[0.875rem] text-ink/70">{kept ? "Kept for good." : until ? `Goes on ${goes(until, tz)} unless you keep it.` : ""}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="chip chip-sm" aria-pressed={kept} disabled={busy} onClick={() => keep(!kept)}>
          {kept ? <Icon name="check" className="h-4 w-4" strokeWidth={2.4} /> : null}
          Keep
        </button>
        {confirming ? (
          <>
            <button type="button" className={buttonClass({ variant: "danger" })} disabled={busy} onClick={remove}>
              Delete it
            </button>
            <button type="button" className="chip chip-sm" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="chip chip-sm" disabled={busy} onClick={() => setConfirming(true)}>
            <Icon name="trash" className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
