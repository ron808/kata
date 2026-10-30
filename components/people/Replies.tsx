"use client";

/**
 * Replies — the thread under a moment: a toggle with the count, the replies, a box to add one,
 * and delete for your own replies (or any reply on your own moment).
 *
 *   <Replies momentId={m._id} count={m.replyCount} momentIsMine={m.isMine} author={m.author.name} />
 *
 * Props: momentId, count, momentIsMine?, author? (the moment's author, for labels), open? (start
 * open), initial? (replies already loaded, as on a moment's page), compact? (for a .well host),
 * onCount?(n). Replying without a handle opens the handle step in place of the box.
 */

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/shared/Avatar";
import { REPLIED_EVENT, type Replied } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import type { ReplyT } from "@/lib/types";
import { api, failure } from "./api";
import { HandleClaim } from "./HandleClaim";
import { plural } from "./labels";
import { Ago } from "./time";
import { useViewerHandle } from "./viewer";

export function Replies({
  momentId,
  count,
  momentIsMine = false,
  author,
  open: startOpen = false,
  initial,
  compact = false,
  onCount,
}: {
  momentId: string;
  count: number;
  momentIsMine?: boolean;
  author?: string;
  open?: boolean;
  initial?: ReplyT[];
  compact?: boolean;
  onCount?: (n: number) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const handle = useViewerHandle();
  const id = useId();
  const [open, setOpen] = useState(startOpen);
  const [replies, setReplies] = useState<ReplyT[] | null>(initial ?? null);
  const [failed, setFailed] = useState(false);
  const [n, setN] = useState(count);
  const [prevCount, setPrevCount] = useState(count);
  if (count !== prevCount) {
    setPrevCount(count);
    setN(count);
  }
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Load the thread the first time it opens.
  useEffect(() => {
    if (!open || replies !== null || failed) return;
    const ctrl = new AbortController();
    api<ReplyT[]>(`/api/moments/${momentId}/replies`, { signal: ctrl.signal })
      .then((r) => (r.ok ? setReplies(r.data) : setFailed(true)))
      .catch(() => {});
    return () => ctrl.abort();
  }, [open, replies, failed, momentId]);

  // The companion posted a reply here: it shows at once, with the thread open.
  useEffect(() => {
    const onReplied = (e: Event) => {
      const { momentId: id, reply, count } = (e as CustomEvent<Replied>).detail;
      if (id !== momentId) return;
      setReplies((rs) => (rs && !rs.some((r) => r._id === reply._id) ? [...rs, reply] : rs));
      setN((x) => count ?? x + 1);
      setOpen(true);
    };
    window.addEventListener(REPLIED_EVENT, onReplied);
    return () => window.removeEventListener(REPLIED_EVENT, onReplied);
  }, [momentId]);

  // An armed delete disarms itself.
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  function changeCount(next: number) {
    setN(next);
    onCount?.(next);
  }

  async function post(e?: FormEvent, knownHandle = false) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || posting) return;
    if (handle === null && !knownHandle) {
      setAsking(true);
      return;
    }
    setPosting(true);
    const r = await api<ReplyT>(`/api/moments/${momentId}/replies`, { method: "POST", body: { text } });
    setPosting(false);
    if (r.ok) {
      setReplies((rs) => [...(rs ?? []), r.data]);
      setDraft("");
      changeCount(n + 1);
      if (knownHandle) router.refresh();
      input.current?.focus();
    } else if (r.needsHandle) {
      setAsking(true);
    } else {
      toast(r.status === 404 ? "That moment is gone." : failure(r, "Couldn’t send your reply. Try again."), "danger");
    }
  }

  async function remove(reply: ReplyT) {
    if (armed !== reply._id) {
      setArmed(reply._id);
      return;
    }
    setArmed(null);
    const before = replies;
    setReplies((rs) => rs?.filter((x) => x._id !== reply._id) ?? rs);
    changeCount(Math.max(0, n - 1));
    const r = await api(`/api/moments/${momentId}/replies?replyId=${reply._id}`, { method: "DELETE" });
    if (r.ok) {
      toast("Reply deleted.");
    } else {
      setReplies(before);
      changeCount(n);
      toast(failure(r, "Couldn’t delete that reply. Try again."), "danger");
    }
  }

  const panel = `${id}-replies`;
  const label = n ? plural(n, "reply", "replies") : "Reply";

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((o) => !o)}
        className="-ml-1 mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-[0.875rem] font-semibold text-ink/75 transition-colors hover:text-ink"
      >
        <Icon name="chat" className="h-[1.1rem] w-[1.1rem]" />
        {label}
        {author && !n ? <span className="sr-only"> to {author}</span> : null}
      </button>

      {open ? (
        <div id={panel} className={compact ? "rule mt-1 border-t-2 pt-3" : "well mt-1 p-3 sm:p-4"}>
          {replies === null ? (
            <p className="text-[0.875rem] text-ink/70" role="status">
              {failed ? (
                <>
                  Replies didn’t load.{" "}
                  <button type="button" className="link font-semibold" onClick={() => setFailed(false)}>
                    Try again
                  </button>
                </>
              ) : (
                "Loading replies…"
              )}
            </p>
          ) : replies.length ? (
            <ol className="space-y-3.5" aria-label="Replies">
              {replies.map((r) => {
                const canDelete = r.isMine || momentIsMine;
                return (
                  <li key={r._id} className="appear flex items-start gap-2.5">
                    <Link href={`/u/${r.author.handle}`} tabIndex={-1} aria-hidden className="mt-0.5 shrink-0">
                      <Avatar name={r.author.name} hue={r.author.hue} size={32} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-1.5 text-[0.875rem] leading-tight">
                        <Link href={`/u/${r.author.handle}`} className="-mx-2 -my-3.5 px-2 py-3.5 font-semibold underline-offset-4 hover:underline">
                          {r.isMine ? "You" : r.author.name}
                        </Link>
                        <Ago iso={r.createdAt} className="text-[0.8125rem] text-ink/65" />
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">{r.text}</p>
                    </div>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        onBlur={() => armed === r._id && setArmed(null)}
                        aria-label={armed === r._id ? "Delete this reply for good" : `Delete reply${r.isMine ? "" : ` from ${r.author.name}`}`}
                        className={`grid h-11 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold transition-colors ${
                          armed === r._id ? "border-2 border-edge bg-surface px-3 text-bad" : "w-11 text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
                        }`}
                      >
                        {armed === r._id ? "Delete" : <Icon name="trash" className="h-[1.1rem] w-[1.1rem]" />}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {asking ? (
            <HandleClaim
              className={replies?.length ? "mt-4" : ""}
              purpose="to reply"
              onCancel={() => {
                setAsking(false);
                requestAnimationFrame(() => input.current?.focus());
              }}
              onClaimed={() => {
                setAsking(false);
                void post(undefined, true);
              }}
            />
          ) : (
            <form onSubmit={post} className={`flex items-center gap-2 ${replies?.length || failed || replies === null ? "mt-3.5" : ""}`}>
              <label htmlFor={`${id}-input`} className="sr-only">
                {author ? `Reply to ${author}` : "Write a reply"}
              </label>
              <input
                ref={input}
                id={`${id}-input`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                placeholder={n ? "Add a reply" : "Be the first to reply"}
                autoComplete="off"
                className="control min-h-11 rounded-full py-2"
              />
              <button
                type="submit"
                disabled={!draft.trim() || posting}
                aria-label="Send reply"
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-edge bg-sun text-on-sun transition-[transform,box-shadow,opacity] duration-300 disabled:opacity-45"
              >
                <Icon name="send" className="h-[1.15rem] w-[1.15rem]" />
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
