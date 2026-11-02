"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/shared/AppPage";
import { Button, buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import type { OwnPageT } from "@/lib/types";
import { hueFromId, plural } from "./data";

/**
 * Every page the writer has made or copied, today's first. Making or copying another never
 * loses one: switch back any time, and what was written with each keeps its own questions.
 */
export function YourPages({ pages }: { pages: OwnPageT[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [list, setList] = useState(pages);
  const [seen, setSeen] = useState(pages);
  if (pages !== seen) {
    setSeen(pages);
    setList(pages);
  }
  const [busy, setBusy] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);

  // An armed delete disarms itself.
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  async function use(p: OwnPageT) {
    if (busy) return;
    setBusy(p._id);
    try {
      const res = await fetch(`/api/templates/${p._id}/use`, { method: "POST" });
      if (!res.ok) throw new Error();
      setList((ps) => ps.map((x) => ({ ...x, active: x._id === p._id })).sort((a, b) => Number(b.active) - Number(a.active)));
      toast(`“${p.name}” is today’s page. The others stay here.`, "success");
      router.refresh();
    } catch {
      toast("That didn’t switch. Try again.", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: OwnPageT) {
    if (busy) return;
    if (armed !== p._id) {
      setArmed(p._id);
      return;
    }
    setArmed(null);
    setBusy(p._id);
    try {
      const res = await fetch(`/api/templates/${p._id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      setList((ps) => ps.filter((x) => x._id !== p._id));
      toast(p.written ? `“${p.name}” is gone. The pages you wrote with it are still in Pages.` : `“${p.name}” is gone.`);
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "That didn’t delete. Try again.", "danger");
    } finally {
      setBusy(null);
    }
  }

  if (!list.length) return null;
  return (
    <Section
      id="your-pages"
      className="mt-10 scroll-mt-24"
      title="Your pages"
      action={<p className="shrink-0 text-sm tabular-nums text-ink/65">{plural(list.length, "page")}</p>}
    >
      <p className="-mt-2 mb-6 max-w-[40rem] text-ink/75">
        Every page you’ve made or copied stays here. Switch any time: what you wrote with each one keeps its own questions.
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <li key={p._id} className="card flex min-w-0 flex-col p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span data-hue={hueFromId(p._id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-edge bg-hue text-on-hue">
                <Icon name="page" className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight [overflow-wrap:anywhere]">{p.name}</p>
                <p className="mt-1 text-[0.8125rem] text-ink/65">
                  {plural(p.questions, "question")} · {p.written ? `${plural(p.written, "page")} written` : "not used yet"}
                  {p.fromGallery ? " · from the gallery" : ""}
                </p>
              </div>
              {p.active ? (
                <span className="tag shrink-0" data-hue="1">
                  Today’s page
                </span>
              ) : null}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
              {p.active ? (
                <Link href="/settings/template" className={buttonClass({ variant: "secondary", size: "sm" })}>
                  <Icon name="pen" className="h-4 w-4" />
                  Edit
                </Link>
              ) : (
                <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => use(p)}>
                  {busy === p._id ? "Switching…" : "Use this one"}
                </Button>
              )}
              {p.active ? (
                <Link href="/entry/new" className="link inline-flex min-h-11 items-center text-[0.875rem] font-semibold">
                  Write your page
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  onBlur={() => armed === p._id && setArmed(null)}
                  disabled={Boolean(busy)}
                  aria-label={armed === p._id ? `Delete ${p.name} for good` : `Delete ${p.name}`}
                  className={`ml-auto grid h-11 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold transition-colors ${
                    armed === p._id ? "border-2 border-edge bg-surface px-3 text-bad" : "w-11 text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
                  }`}
                >
                  {armed === p._id ? "Delete" : <Icon name="trash" className="h-[1.1rem] w-[1.1rem]" />}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
