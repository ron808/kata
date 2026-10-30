"use client";

import { useEffect, useState } from "react";
import { MaruMark } from "@/components/shared/Avatar";

/** Maru's few sentences on a breakdown: written the first time it's opened, then kept with it. */
export function Take({ id, initial, name }: { id: string; initial: string; name: string }) {
  const [take, setTake] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initial) return;
    let live = true;
    fetch(`/api/breakdowns/${id}/take`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { take: string }) => {
        if (live) setTake(d.take);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [id, initial, attempt]);

  return (
    <div className="flex items-start gap-3">
      <MaruMark size={40} title={name} />
      {take ? (
        <p className="bubble-kata appear max-w-[62ch] px-4 py-3 text-[1.0125rem] leading-snug">{take}</p>
      ) : failed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <p className="text-ink/75">{name} couldn’t write about this just now.</p>
          <button
            type="button"
            className="chip chip-sm"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <span className="bubble-kata px-4 py-3.5">
          <span className="typing" role="status" aria-label={`${name} is writing about it`}>
            <i />
            <i />
            <i />
          </span>
        </span>
      )}
    </div>
  );
}
