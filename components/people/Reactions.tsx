"use client";

/**
 * Reactions — Nice, Same, Go on and Hug under a moment, as one .scale row.
 *
 *   <Reactions momentId={m._id} reactions={m.reactions} mine={m.mine} author={m.author.name} />
 *
 * Props: momentId, reactions (counts), mine (the viewer's), author? (for the group's label),
 * className?. A tap toggles yours at once and the server's counts follow. Without a handle the
 * handle step opens under the row, and the reaction lands once it's claimed.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import type { ReactionKind } from "@/lib/types";
import { api, failure } from "./api";
import { HandleClaim } from "./HandleClaim";
import { REACTIONS } from "./labels";
import { useViewerHandle } from "./viewer";

type Counts = Record<ReactionKind, number>;
interface Given {
  reactions: Counts;
  mine: ReactionKind[];
}

function flip(state: Given, kind: ReactionKind): Given {
  const on = state.mine.includes(kind);
  return {
    reactions: { ...state.reactions, [kind]: Math.max(0, state.reactions[kind] + (on ? -1 : 1)) },
    mine: on ? state.mine.filter((k) => k !== kind) : [...state.mine, kind],
  };
}

export function Reactions({
  momentId,
  reactions,
  mine,
  author,
  className = "",
}: {
  momentId: string;
  reactions: Counts;
  mine: ReactionKind[];
  author?: string;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const handle = useViewerHandle();
  const [state, setState] = useState<Given>({ reactions, mine });
  const [prev, setPrev] = useState<Given>({ reactions, mine });
  if (prev.reactions !== reactions || prev.mine !== mine) {
    setPrev({ reactions, mine });
    setState({ reactions, mine });
  }
  const [asking, setAsking] = useState<ReactionKind | null>(null);
  const buttons = useRef<Partial<Record<ReactionKind, HTMLButtonElement | null>>>({});

  // One request at a time; when the last lands, the server's counts replace the guesses.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const confirmed = useRef<Given>({ reactions, mine });
  const refresh = useRef(false);
  useEffect(() => {
    if (pending.current === 0) confirmed.current = { reactions, mine };
  }, [reactions, mine]);

  function toggle(kind: ReactionKind, knownHandle = false) {
    if (handle === null && !knownHandle) {
      setAsking(kind);
      return;
    }
    setState((s) => flip(s, kind));
    pending.current += 1;
    queue.current = queue.current.then(async () => {
      const r = await api<Given>(`/api/moments/${momentId}/reactions`, { method: "POST", body: { kind } });
      pending.current -= 1;
      if (r.ok) confirmed.current = r.data;
      else if (r.needsHandle) setAsking(kind);
      else toast(r.status === 404 ? "That moment is gone." : failure(r, "Couldn’t save your reaction. Try again."), "danger");
      if (pending.current === 0) {
        setState(confirmed.current);
        if (refresh.current) {
          refresh.current = false;
          router.refresh();
        }
      }
    });
  }

  return (
    <div className={className}>
      <div role="group" aria-label={author ? `React to ${author}’s moment` : "React"} className="scale">
        {REACTIONS.map(({ kind, label }) => {
          const on = state.mine.includes(kind);
          const n = state.reactions[kind];
          return (
            <button
              key={kind}
              ref={(el) => {
                buttons.current[kind] = el;
              }}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(kind)}
              className="scale-step scale-row min-h-11 gap-1.5 px-1 text-[0.8125rem] focus-visible:-outline-offset-4 lg:min-h-10"
            >
              <span>{label}</span>
              {n ? <span className="tabular-nums opacity-70">{n}</span> : null}
            </button>
          );
        })}
      </div>
      {asking ? (
        <HandleClaim
          className="mt-3"
          purpose="to react"
          onCancel={() => {
            buttons.current[asking]?.focus();
            setAsking(null);
          }}
          onClaimed={() => {
            setAsking(null);
            refresh.current = true;
            toggle(asking, true);
          }}
        />
      ) : null}
    </div>
  );
}
