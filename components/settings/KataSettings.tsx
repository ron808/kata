"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CHECK_INS, checkInInfo, type CheckIn } from "@/components/onboarding/script";
import { MaruMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { MaruColours } from "@/components/shared/MaruColours";
import { Icon } from "@/components/shared/Icon";
import { TextField } from "@/components/shared/TextField";
import { useToast } from "@/components/shared/Toast";
import { COMPANION_NAME_MAX, DEFAULT_COMPANION, NAME_IDEAS, NICKNAME_MAX } from "@/lib/companion/name";
import { InterestPicker } from "./InterestPicker";

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** The companion's names, how it checks in (saved as you pick) and what it asks about. */
export function KataSettings({
  initialCheckIn,
  initialInterests,
  options,
  timezone,
  ai,
}: {
  initialCheckIn: CheckIn;
  initialInterests: string[];
  options: string[];
  timezone: string;
  /** Kata talks through a language model (Groq) rather than its built-in rules. */
  ai: boolean;
}) {
  const { toast } = useToast();
  const { name } = useCompanion();
  const [checkIn, setCheckIn] = useState<CheckIn>(initialCheckIn);
  const [pending, setPending] = useState<CheckIn | null>(null);
  const [interests, setInterests] = useState(initialInterests);
  const [savedInterests, setSavedInterests] = useState(initialInterests);
  const [savingInterests, setSavingInterests] = useState(false);
  const dirty = !sameSet(interests, savedInterests);

  async function pick(next: CheckIn) {
    if (next === checkIn || pending) return;
    const before = checkIn;
    setCheckIn(next);
    setPending(next);
    try {
      const res = await fetch("/api/settings/kata", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn: next }),
      });
      if (!res.ok) throw new Error();
      toast(`${name} ${checkInInfo(next).line.replace(/^Checks/, "checks").toLowerCase()}.`, "success");
    } catch {
      setCheckIn(before);
      toast("Couldn’t change that. Try again.", "danger");
    } finally {
      setPending(null);
    }
  }

  async function saveInterests() {
    if (savingInterests || !dirty) return;
    setSavingInterests(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      });
      const data = (await res.json().catch(() => ({}))) as { interests?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      const stored = data.interests ?? interests;
      setInterests(stored);
      setSavedInterests(stored);
      toast(`Saved. ${name} will ask about these.`, "success");
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "Couldn’t save that. Try again.", "danger");
    } finally {
      setSavingInterests(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-3.5">
        <MaruMark size={44} />
        <div className="min-w-0">
          <h2 id="kata-title" className="font-display text-display-s [overflow-wrap:anywhere]">
            {name}
          </h2>
          <p className="mt-1 text-sm text-ink/70" aria-live="polite">
            {checkInInfo(checkIn).line}
          </p>
        </div>
      </header>

      <Names />

      <div className="rule mt-7 border-t-2 pt-6">
        <h3 id="checkin-label" className="font-semibold">
          When {name} checks in
        </h3>
        <p className="mt-1 text-sm text-ink/70">Times follow your time zone, {timezone.replace(/_/g, " ")}.</p>
        <div role="group" aria-labelledby="checkin-label" className="scale mt-3.5 w-full max-w-[24rem]">
          {CHECK_INS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="scale-step min-h-[3.75rem]"
              aria-pressed={checkIn === c.value}
              disabled={Boolean(pending) && pending !== c.value}
              onClick={() => pick(c.value)}
            >
              <span aria-hidden className="flex items-center gap-0.5">
                {c.value !== "evening" ? <Icon name="sun" className="h-[1.15rem] w-[1.15rem]" /> : null}
                {c.value !== "morning" ? <Icon name="moon" className="h-[1.05rem] w-[1.05rem]" /> : null}
              </span>
              <span className="text-[0.875rem]">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rule mt-7 border-t-2 pt-6">
        <h3 id="interests-label" className="font-semibold">
          What {name} asks about
        </h3>
        <p className="mt-1 text-sm text-ink/70">
          {name} adds up to three questions to your page each day, drawn from your threads and these.
        </p>
        <div className="mt-4">
          <InterestPicker
            id="settings-interests"
            options={options}
            value={interests}
            onChange={setInterests}
            labelledBy="interests-label"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {dirty ? (
            <Button variant="quiet" onClick={() => setInterests(savedInterests)}>
              Undo
            </Button>
          ) : null}
          <Button variant="secondary" onClick={saveInterests} disabled={!dirty || savingInterests}>
            {savingInterests ? "Saving…" : "Save interests"}
          </Button>
        </div>
      </div>

      <div className="rule mt-7 border-t-2 pt-6">
        <h3 className="font-semibold">How {name} thinks</h3>
        {ai ? (
          <p className="mt-1 text-sm text-ink/70">
            {name} writes its replies with an AI model run by Groq. When you talk to it, what you say, your threads, what it
            remembers, your last few pages and, when you ask about them, the posts on your screen go to Groq to write the
            reply. {name} can get things wrong, and you can see or delete what it remembers on{" "}
            <Link href="/threads#memories" className="link font-semibold text-ink">
              Threads
            </Link>
            .
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink/70">
            {name} is running on its built-in rules: it keeps your threads and asks its questions, but its replies are short
            and fixed. Add a Groq key to give it an AI model.
          </p>
        )}
      </div>
    </>
  );
}

/** What the writer calls their companion, and what it calls them. Saved with a button. */
function Names() {
  const router = useRouter();
  const { toast } = useToast();
  const names = useCompanion();
  const [companion, setCompanion] = useState(names.name);
  const [nickname, setNickname] = useState(names.nickname);
  const [hue, setHue] = useState(names.hue);
  const [saving, setSaving] = useState(false);
  const dirty = companion.trim() !== names.name || nickname.trim() !== names.nickname || hue !== names.hue;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/kata", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionName: companion, nickname, companionHue: hue }),
      });
      const data = (await res.json().catch(() => ({}))) as { companionName?: string; nickname?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      setCompanion(data.companionName ?? companion);
      setNickname(data.nickname ?? nickname);
      toast(`Saved. Say hello to ${data.companionName ?? companion}.`, "success");
      // The new names reach every page through the shell.
      router.refresh();
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "Couldn’t save that. Try again.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="rule mt-7 border-t-2 pt-6">
      <h3 className="font-semibold">Names and colour</h3>
      <p className="mt-1 text-sm text-ink/70">Call your companion anything you like, choose what it calls you, and pick its colour.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="companion-name"
          label="Its name"
          value={companion}
          maxLength={COMPANION_NAME_MAX}
          placeholder={DEFAULT_COMPANION}
          autoComplete="off"
          onChange={(e) => setCompanion(e.target.value)}
        />
        <TextField
          id="companion-nickname"
          label="What it calls you"
          value={nickname}
          maxLength={NICKNAME_MAX}
          autoComplete="nickname"
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Name ideas">
        {NAME_IDEAS.map((idea) => (
          <button key={idea} type="button" className="chip chip-sm" aria-pressed={companion.trim() === idea} onClick={() => setCompanion(idea)}>
            {idea}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <MaruColours value={hue} onChange={setHue} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {dirty ? (
          <Button
            variant="quiet"
            onClick={() => {
              setCompanion(names.name);
              setNickname(names.nickname);
              setHue(names.hue);
            }}
          >
            Undo
          </Button>
        ) : null}
        <Button type="submit" variant="secondary" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
