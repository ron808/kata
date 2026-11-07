"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { AccountCounts, FreshPart } from "@/lib/account";
import { PasswordField } from "@/components/auth/PasswordField";
import { plural } from "@/components/people/labels";
import { Button, buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { FormAlert } from "@/components/shared/TextField";
import { useToast } from "@/components/shared/Toast";

/**
 * Start fresh and Delete account, at the end of Settings. Each asks a few questions first, in a modal dialog,
 * and neither happens without the password. Start fresh clears what they pick and keeps the account; deleting
 * offers start fresh instead, then a copy of their pages, then says exactly what goes.
 *
 *   <StartOver counts={await accountCounts(id)} companion={name} />
 */
type Flow = "fresh" | "delete";

export function StartOver({ counts, companion }: { counts: AccountCounts; companion: string }) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [seq, setSeq] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);

  const show = (f: Flow) => {
    setSeq((s) => s + 1);
    setFlow(f);
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (flow && !d.open) d.showModal();
    else if (!flow && d.open) d.close();
  }, [flow]);

  // The page behind stays put while the questions are up.
  useEffect(() => {
    if (!flow) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [flow]);

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-3">
        <Choice
          title="Start fresh"
          body={`Clear what you’ve written and what ${companion} knows. Your account, profile, people and messages stay.`}
        >
          <Button variant="secondary" onClick={() => show("fresh")}>
            Start fresh…
          </Button>
        </Choice>
        <Choice title="Delete your account" body="Your account and everything in it go for good, and so does your handle.">
          <Button variant="danger" onClick={() => show("delete")}>
            Delete account…
          </Button>
        </Choice>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="start-over-title"
        onClose={() => setFlow(null)}
        onCancel={(e) => {
          if (busy.current) e.preventDefault();
        }}
        className="m-auto max-h-[calc(100svh-1.5rem)] w-[min(34rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border-2 border-edge bg-surface p-0 text-ink shadow-sticker backdrop:bg-[rgb(20_13_6/0.6)] open:flex"
      >
        {flow ? (
          <Sheet
            key={`${flow}-${seq}`}
            flow={flow}
            counts={counts}
            companion={companion}
            onSwitch={show}
            onClose={() => setFlow(null)}
            onBusy={(b) => {
              busy.current = b;
            }}
          />
        ) : null}
      </dialog>
    </>
  );
}

function Choice({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="well flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4 sm:p-5">
      <div className="min-w-0 flex-1 basis-60">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-ink/75">{body}</p>
      </div>
      {children}
    </div>
  );
}

const STEPS = { fresh: ["what", "setup", "confirm"], delete: ["instead", "copy", "confirm"] } as const;

function Sheet({
  flow,
  counts,
  companion,
  onSwitch,
  onClose,
  onBusy,
}: {
  flow: Flow;
  counts: AccountCounts;
  companion: string;
  onSwitch: (f: Flow) => void;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const steps = STEPS[flow];
  const [at, setAt] = useState(0);
  const [parts, setParts] = useState<FreshPart[]>(["pages", "threads", "maru"]);
  const [setup, setSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = steps[at];

  // Each question starts at its own heading, so a screen reader hears it first.
  useEffect(() => {
    heading.current?.focus();
  }, [at]);

  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);

  const options: { part: FreshPart; label: string; detail: string }[] = [
    { part: "pages", label: "Your pages", detail: [plural(counts.pages, "page"), counts.letters ? plural(counts.letters, "letter") : ""].filter(Boolean).join(" and ") },
    { part: "threads", label: "Threads and lists", detail: `${plural(counts.threads, "thread")} and ${plural(counts.lists, "list")}` },
    {
      part: "maru",
      label: `${companion}’s conversation and memories`,
      detail: counts.memories ? `Everything you’ve said to ${companion}, and ${plural(counts.memories, "memory", "memories")}` : `Everything you’ve said to ${companion}`,
    },
    { part: "posts", label: "Your posts and replies", detail: `${plural(counts.posts, "post")} and ${plural(counts.replies, "reply", "replies")}. Other people stop seeing them.` },
  ];
  const chosen = options.filter((o) => parts.includes(o.part));

  async function finish() {
    if (busy) return;
    if (!password) {
      setWrong("Enter your password.");
      document.getElementById("start-over-password")?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setWrong(undefined);
    try {
      const res = await fetch(flow === "fresh" ? "/api/account/fresh" : "/api/account", {
        method: flow === "fresh" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow === "fresh" ? { password, parts, setup } : { password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = data.error ?? "That didn’t work. Try again in a moment.";
        if (/password/i.test(msg)) {
          setWrong(msg);
          document.getElementById("start-over-password")?.focus();
        } else setError(msg);
        setBusy(false);
        return;
      }
      if (flow === "delete") {
        await signOut({ callbackUrl: "/bye" });
        return;
      }
      toast("Cleared. A fresh start.", "success");
      onBusy(false);
      onClose();
      router.push(setup ? "/onboarding" : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again in a moment.");
      setBusy(false);
    }
  }

  const back = at > 0 ? () => setAt(at - 1) : null;
  const next = () => setAt(at + 1);

  let title = "";
  let body: ReactNode = null;
  let actions: ReactNode = null;
  switch (step) {
    case "what":
      title = "What should go?";
      body = (
        <>
          <p className="text-ink/75">Your account, profile and handle stay, and so do your people, messages and page layouts.</p>
          <ul className="well mt-4 grid grid-cols-1 gap-1 p-1.5" aria-label="What to clear">
            {options.map((o) => {
              const on = parts.includes(o.part);
              return (
                <li key={o.part}>
                  <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-sm px-2.5 py-2.5 transition-colors hover:bg-ink/[0.05]">
                    <span className="relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setParts((p) => (e.target.checked ? [...p, o.part] : p.filter((x) => x !== o.part)))}
                        aria-describedby={`start-over-${o.part}`}
                        className="peer absolute inset-0 m-0 h-6 w-6 cursor-pointer appearance-none rounded-[7px] border-2 border-edge bg-surface transition-colors duration-300 checked:bg-sun"
                      />
                      <Icon name="check" className="pointer-events-none relative h-4 w-4 text-on-sun opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={2.6} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">{o.label}</span>
                      <span id={`start-over-${o.part}`} className="mt-0.5 block text-sm text-ink/70">
                        {o.detail}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-ink/70">Breakdowns go with your pages and threads, since they’re worked out from them.</p>
        </>
      );
      actions = (
        <Button onClick={next} disabled={!parts.length}>
          Next
        </Button>
      );
      break;
    case "setup":
      title = "Go through setup again?";
      body = (
        <>
          <p className="text-ink/75">
            Setup asks what fills your days, makes your page and lets you rename {companion}. Your page layouts stay either way.
          </p>
          <div role="radiogroup" aria-label="Setup" className="mt-4 flex flex-wrap gap-2">
            {[
              { on: false, label: "No, keep my setup" },
              { on: true, label: "Yes, set up again" },
            ].map((c) => (
              <button key={c.label} type="button" role="radio" aria-checked={setup === c.on} onClick={() => setSetup(c.on)} className="chip min-h-11">
                {c.label}
              </button>
            ))}
          </div>
        </>
      );
      actions = <Button onClick={next}>Next</Button>;
      break;
    case "instead":
      title = "Would starting fresh do?";
      body = (
        <>
          <p className="text-ink/75">
            Starting fresh clears your pages, threads and what {companion} knows, and keeps your account, your handle and your people. Deleting
            removes all of it, for good.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button type="button" onClick={() => onSwitch("fresh")} className="well flex min-h-14 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink/[0.05]">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Start fresh instead</span>
                <span className="mt-0.5 block text-sm text-ink/70">Keep the account, clear the rest</span>
              </span>
              <Icon name="arrow" className="h-5 w-5 shrink-0" />
            </button>
            <button type="button" onClick={next} className="well flex min-h-14 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink/[0.05]">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-bad">Delete my account</span>
                <span className="mt-0.5 block text-sm text-ink/70">Everything goes</span>
              </span>
              <Icon name="arrow" className="h-5 w-5 shrink-0" />
            </button>
          </div>
        </>
      );
      break;
    case "copy":
      title = "Do you want a copy of your pages?";
      body = counts.pages ? (
        <>
          <p className="text-ink/75">
            One file with every page you’ve written, what {companion} kept track of and what it remembered. Once the account is gone, it can’t be got
            back.
          </p>
          <a href="/api/account/export" download onClick={() => setCopied(true)} className={`${buttonClass({ variant: "secondary" })} mt-4`}>
            <Icon name="arrow-down" className="h-4 w-4" />
            Download my pages
          </a>
          {copied ? (
            <p role="status" className="mt-3 text-sm text-ink/70">
              Downloading {plural(counts.pages, "page")}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-ink/75">You haven’t written any pages, so there’s nothing to download.</p>
      );
      actions = <Button onClick={next}>Next</Button>;
      break;
    case "confirm":
      title = flow === "fresh" ? "Clear it for good?" : "Delete your account?";
      body = (
        <>
          <p className="text-ink/75">{flow === "fresh" ? "This clears, for good:" : "This removes, for good:"}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem]">
            {flow === "fresh" ? (
              chosen.map((o) => <li key={o.part}>{o.label}</li>)
            ) : (
              <>
                <li>Your pages and letters</li>
                <li>Threads, lists and breakdowns</li>
                <li>{companion}’s conversation and memories</li>
                <li>Your profile, handle and page layouts, and your posts and replies</li>
                <li>Who you follow and who follows you</li>
                <li>Your conversations, for both of you</li>
              </>
            )}
          </ul>
          {flow === "fresh" && parts.includes("pages") && counts.pages ? (
            <p className="mt-3 text-sm text-ink/70">
              Want a copy first?{" "}
              <a href="/api/account/export" download className="link">
                Download your pages
              </a>
              .
            </p>
          ) : null}
          <form
            className="mt-5 grid grid-cols-1 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void finish();
            }}
          >
            <PasswordField
              id="start-over-password"
              label="Your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={wrong}
              hint="It can’t be undone, so Kata checks it’s you."
            />
            {error ? <FormAlert>{error}</FormAlert> : null}
          </form>
        </>
      );
      actions = (
        <Button variant="danger" onClick={() => void finish()} disabled={busy}>
          {busy ? (flow === "fresh" ? "Clearing…" : "Deleting…") : flow === "fresh" ? "Clear it" : "Delete my account"}
        </Button>
      );
      break;
  }

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-edge px-5 py-3 sm:px-6">
        <p className="text-sm font-semibold text-ink/70">
          {flow === "fresh" ? "Start fresh" : "Delete account"} · {at + 1} of {steps.length}
        </p>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="chip !h-11 !w-11 shrink-0 !px-0">
          <Icon name="close" className="h-5 w-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <h2 id="start-over-title" ref={heading} tabIndex={-1} className="font-display text-display-s focus-visible:outline-none">
          {title}
        </h2>
        <div className="mt-3">{body}</div>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t-2 border-edge px-5 py-3 sm:px-6">
        {back ? (
          <Button variant="quiet" onClick={back} disabled={busy} className="mr-auto">
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </Button>
        ) : (
          <Button variant="quiet" onClick={onClose} className="mr-auto">
            Cancel
          </Button>
        )}
        {actions}
      </footer>
    </>
  );
}

/** On the goodbye page: a session that outlived its account is signed out, so nothing reads as signed in. */
export function SignOutQuietly() {
  useEffect(() => {
    void signOut({ redirect: false }).catch(() => {});
  }, []);
  return null;
}
