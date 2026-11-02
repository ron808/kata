"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { InterestPicker } from "@/components/settings/InterestPicker";
import { useHandleStatus } from "@/components/settings/HandleField";
import { MaruMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { COMPANION_NAME_MAX, DEFAULT_COMPANION, NICKNAME_MAX, tidyName } from "@/lib/companion/name";
import { presetByKey } from "@/lib/roles";
import type { RoleKey } from "@/lib/types";
import { CheckInChoice, FocusPicker, HandleChoice, NamesChoice, PageChoice, RoleChoice } from "./Controls";
import { LivePanel } from "./LivePanel";
import { checkInInfo, cleanHandle, interestChoices, joinWords, roleInfo, type CheckIn } from "./script";

type Step = "names" | "role" | "plate" | "interests" | "checkin" | "page" | "handle" | "finish";
const STEPS: Step[] = ["names", "role", "plate", "interests", "checkin", "page", "handle", "finish"];
const STEPS_WITH_A_PAGE = STEPS.filter((s) => s !== "page");
/** Everything but "finish" is a question. */

/** What the companion says to open each step. The last line is the question the step's controls answer. */
function kataLines(step: Step, first: string, companion: string, role: RoleKey | null, threads: number): string[] {
  switch (step) {
    case "names":
      return [
        `Hi${first ? ` ${first}` : ""}, I’m ${DEFAULT_COMPANION}.`,
        "I’ll check in each day and keep track of what you’re working on.",
        "What should I call you? You can rename me too.",
      ];
    case "role":
      return [`${companion} it is.`, "First, what fills most of your days?"];
    case "plate":
      return [
        roleInfo(role ?? "custom").ack,
        "What’s on your plate this week? Add up to six things and I’ll keep each one as a thread.",
      ];
    case "interests":
      return [
        threads === 0
          ? "No problem. Tell me whenever something comes up and I’ll add it."
          : threads === 1
            ? "Got it. That’s your first thread."
            : `Got it. That’s ${threads} threads.`,
        "What would you like me to ask about? Pick a few and I’ll shape my questions around them.",
      ];
    case "checkin":
      return ["When do you usually open Kata? I don’t send notifications: my check-in will be ready when you come."];
    case "page":
      return [
        "Here’s your page. It’s what you’ll fill in each day.",
        "Keep what helps and drop the rest. I’ll add up to three questions of my own each day.",
      ];
    case "handle":
      return [
        "Last one. Pick a handle so friends can find you.",
        "Your pages stay private. People only see what you choose to share.",
      ];
    case "finish":
      return [`That’s everything${first ? `, ${first}` : ""}.`, "I’ll set up your page and put your threads on your map."];
  }
}

function sentence(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function OnboardingFlow({
  firstName,
  currentHandle,
  suggestedHandle,
  interestTags,
  today,
  hasPage,
}: {
  firstName: string;
  currentHandle: string | null;
  suggestedHandle: string | null;
  /** They already have a daily page, which stays: there's no choosing one. */
  hasPage: boolean;
  /** Topics Kata has questions for (the question bank's tags). */
  interestTags: string[];
  /** Today's date, formatted on the server; the visitor's local date replaces it. */
  today: string;
}) {
  const router = useRouter();
  // The step Kata is on, and how many of its lines are out so far. The greeting starts out.
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(2);
  const [editing, setEditing] = useState<Step | null>(null);
  const [said, setSaid] = useState("");

  const [nickname, setNickname] = useState(firstName);
  const [companionName, setCompanionName] = useState(DEFAULT_COMPANION);
  const [companionHue, setCompanionHue] = useState<number | null>(null);
  const [role, setRole] = useState<RoleKey | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [dropped, setDropped] = useState<number[]>([]);
  const [handle, setHandle] = useState(currentHandle ?? suggestedHandle ?? "");
  const [handleSkipped, setHandleSkipped] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleStatus = useHandleStatus(handle, currentHandle);
  const lastInput = useRef<"keyboard" | "pointer" | "touch">("keyboard");
  const steps = hasPage ? STEPS_WITH_A_PAGE : STEPS;
  const questionCount = steps.length - 1;
  const wantFocus = useRef(false);
  const controls = useRef<HTMLLIElement | null>(null);
  const question = useRef<HTMLParagraphElement | null>(null);

  const step = steps[at];
  // What they chose to be called, and to call their companion, from the first answer on.
  const named = at > 0 ? tidyName(nickname, NICKNAME_MAX) || firstName : firstName;
  const companion = at > 0 ? tidyName(companionName, COMPANION_NAME_MAX) || DEFAULT_COMPANION : DEFAULT_COMPANION;
  // The greeting keeps the name they signed up with; the rest use the one they chose.
  const called = step === "names" ? firstName : named;
  const lines = useMemo(() => kataLines(step, called, companion, role, focus.length), [step, called, companion, role, focus.length]);
  const composing = shown < lines.length;
  const preset = role ? presetByKey(role) : null;
  const fields = preset?.fields ?? [];
  const kept = fields.filter((_, i) => !dropped.includes(i));
  const claimed = !handleSkipped && at > steps.indexOf("handle") ? cleanHandle(handle) || null : null;

  // Kata "types" each line of the current step, one at a time. Reduced motion: all at once.
  useEffect(() => {
    if (!composing) return;
    const reduce = reduceMotion();
    const previous = lines[shown - 1] ?? "";
    const delay = reduce ? 0 : shown === 0 ? 450 : Math.min(300 + previous.length * 8, 750);
    const t = window.setTimeout(() => {
      const next = reduce ? lines.length : shown + 1;
      setSaid(`${companion}: ${lines.slice(shown, next).join(" ")}`);
      setShown(next);
    }, delay);
    return () => window.clearTimeout(t);
  }, [composing, shown, lines, companion]);

  // When a step's controls appear (or an answer opens for a change): bring them into view,
  // keeping Kata's question on screen, and move focus there unless the answer came by touch.
  useEffect(() => {
    if (composing && !editing) return;
    const box = controls.current;
    if (!box) return;
    const reduce = reduceMotion();
    const top = (editing ? box : (question.current ?? box)).getBoundingClientRect().top;
    const bottom = box.getBoundingClientRect().bottom;
    let delta = Math.max(0, bottom - (window.innerHeight - 24));
    if (top - delta < 16) delta = Math.max(0, top - 16);
    if (delta > 0) window.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
    if (wantFocus.current) {
      wantFocus.current = false;
      box.querySelector<HTMLElement>("input:not([disabled]), button:not([disabled])")?.focus({ preventScroll: true });
    }
  }, [composing, editing, at]);

  /** The answer is in: close a change, or move Kata on to the next step. */
  function done() {
    wantFocus.current = lastInput.current !== "touch";
    if (editing) {
      setEditing(null);
      return;
    }
    setAt((a) => Math.min(a + 1, steps.length - 1));
    setShown(0);
  }

  function change(s: Step) {
    wantFocus.current = lastInput.current !== "touch";
    setSaveError(null);
    setEditing(s);
  }

  function answerText(s: Step): string {
    switch (s) {
      case "names":
        return `Call me ${named}. You’re ${companion}.`;
      case "role":
        return roleInfo(role ?? "custom").said;
      case "plate":
        return focus.length ? `${sentence(joinWords(focus))}.` : "Nothing yet.";
      case "interests":
        return interests.length ? `${sentence(joinWords(interests.map((i) => i.replace(/-/g, " "))))}.` : "Nothing in particular yet.";
      case "checkin":
        return checkInInfo(checkIn ?? "morning").said;
      case "page":
        return dropped.length
          ? `Keeping ${kept.length} of ${fields.length} questions.`
          : fields.length === 1
            ? "Keeping it."
            : `Keeping all ${fields.length}.`;
      case "handle":
        return claimed ? `@${claimed}` : "I’ll skip this for now.";
      default:
        return "";
    }
  }

  async function finish() {
    if (saving || !role) return;
    setSaving(true);
    setSaveError(null);
    setSaid(`${companion} is setting things up.`);
    try {
      const h = handleSkipped ? "" : cleanHandle(handle);
      if (h && h !== currentHandle) {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: h }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setHandleError(data.error ?? "That handle didn’t work. Try another.");
          setSaving(false);
          change("handle");
          return;
        }
      }
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          focus,
          interests,
          checkIn: checkIn ?? "morning",
          nickname: named === firstName ? "" : named,
          companionName: companion === DEFAULT_COMPANION ? "" : companion,
          ...(companionHue ? { companionHue } : {}),
          ...(dropped.length && !hasPage
            ? { fields: kept.map((f, i) => ({ ...f, id: nanoid(8), order: i, config: { ...f.config } })) }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong on my side.");
      }
      router.push("/dashboard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong on my side.");
      setSaving(false);
    }
  }

  function controlsFor(s: Step) {
    const labelledBy = `kata-q-${s}`;
    const next = (label: string) => (
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={done}>
          {editing ? "Done" : label}
          {editing ? null : <Icon name="arrow" className="h-4 w-4" />}
        </Button>
      </div>
    );
    switch (s) {
      case "names":
        return (
          <NamesChoice
            nickname={nickname}
            companion={companionName}
            onNickname={setNickname}
            onCompanion={setCompanionName}
            hue={companionHue}
            onHue={setCompanionHue}
            onDone={done}
            labelledBy={labelledBy}
            editing={Boolean(editing)}
          />
        );
      case "role":
        return (
          <RoleChoice
            value={editing ? role : null}
            labelledBy={labelledBy}
            onPick={(r) => {
              if (r !== role) setDropped([]);
              setRole(r);
              done();
            }}
          />
        );
      case "plate":
        return (
          <>
            <FocusPicker id="focus" role={role ?? "custom"} value={focus} onChange={setFocus} labelledBy={labelledBy} />
            {next(focus.length ? "That’s my week" : "Skip for now")}
          </>
        );
      case "interests":
        return (
          <>
            <InterestPicker
              id="interests"
              options={interestChoices(role, interestTags)}
              value={interests}
              onChange={setInterests}
              labelledBy={labelledBy}
            />
            {next(interests.length ? "That’s it" : "Skip for now")}
          </>
        );
      case "checkin":
        return (
          <CheckInChoice
            value={editing ? checkIn : null}
            labelledBy={labelledBy}
            onPick={(c) => {
              setCheckIn(c);
              done();
            }}
          />
        );
      case "page":
        return (
          <>
            <PageChoice fields={fields} dropped={dropped} onChange={setDropped} labelledBy={labelledBy} />
            {next("Looks good")}
          </>
        );
      case "handle":
        return (
          <HandleChoice
            id="handle"
            value={handle}
            status={handleStatus}
            error={handleError}
            labelledBy={labelledBy}
            onChange={(v) => {
              setHandle(v);
              setHandleError(null);
            }}
            onUse={() => {
              setHandleSkipped(false);
              done();
            }}
            onSkip={() => {
              setHandleSkipped(true);
              setHandleError(null);
              done();
            }}
          />
        );
      case "finish":
        return (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button size="lg" onClick={finish} disabled={saving}>
              {saving ? "Setting up…" : saveError ? "Try again" : "Finish setup"}
              {saving ? null : <Icon name="arrow" className="h-[1.1rem] w-[1.1rem]" />}
            </Button>
            <p className="text-sm text-ink/65">You can change all of this later in settings.</p>
          </div>
        );
    }
  }

  return (
    <div
      // The colour they pick shows on the companion's face here at once.
      data-maru={companionHue ?? undefined}
      onPointerDown={(e) => {
        lastInput.current = e.pointerType === "touch" || e.pointerType === "pen" ? "touch" : "pointer";
      }}
      onKeyDown={() => {
        lastInput.current = "keyboard";
      }}
    >
      <p className="text-[0.9375rem] font-medium text-ink/70">A few quick questions, then today’s page is ready.</p>
      <h1 className="mt-2 font-display text-display-l [overflow-wrap:anywhere]">
        Meet <span className="mark">{companion}</span>.
      </h1>

      <div className="mt-[clamp(1.75rem,4vw,3rem)] grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <section aria-labelledby="kata-convo" className="card min-w-0 p-4 sm:p-6 lg:col-span-7">
          <header className="flex items-center gap-3">
            <MaruMark size={42} />
            <div className="min-w-0">
              <h2 id="kata-convo" className="truncate font-semibold leading-tight">
                {companion}
              </h2>
              <p className="text-[0.8125rem] text-ink/65">Getting to know you</p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <span aria-hidden className="flex gap-1">
                {Array.from({ length: questionCount }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full border-2 border-edge transition-colors duration-300 ${
                      i < at ? "bg-sun" : i === at ? "bg-ink" : ""
                    }`}
                  />
                ))}
              </span>
              <span className="text-[0.8125rem] font-semibold tabular-nums text-ink/65">
                {at < questionCount ? (
                  <>
                    <span className="sr-only">Question </span>
                    {at + 1} of {questionCount}
                  </>
                ) : (
                  "All set"
                )}
              </span>
            </div>
          </header>

          <ol className="mt-6 grid grid-cols-1 gap-3">
            {steps.slice(0, at + 1).map((s, i) => {
              const all = i < at ? kataLines(s, s === "names" ? firstName : named, companion, role, focus.length) : lines;
              const visible = i < at ? all : all.slice(0, shown);
              const ready = i < at || shown >= all.length;
              const open = editing ? editing === s : i === at;
              return (
                <Fragment key={s}>
                  {visible.map((text, j) => {
                    const isQuestion = j === all.length - 1;
                    return (
                      <li key={`${s}-${j}`} className="appear flex min-w-0">
                        <p
                          id={isQuestion ? `kata-q-${s}` : undefined}
                          ref={isQuestion && i === at ? question : undefined}
                          className="bubble-kata max-w-[38ch] px-4 py-2.5 leading-snug"
                        >
                          <span className="sr-only">{companion}: </span>
                          {text}
                        </p>
                      </li>
                    );
                  })}
                  {ready && open ? (
                    <li ref={controls} className="appear min-w-0 pb-1 pt-0.5">
                      {controlsFor(s)}
                    </li>
                  ) : null}
                  {i < at && !open && s !== "finish" ? (
                    <li className="appear flex min-w-0 justify-end pl-8">
                      <button
                        type="button"
                        onClick={() => change(s)}
                        disabled={saving}
                        aria-label={`You said: ${answerText(s)} Change this answer`}
                        className="bubble-you group inline-flex min-h-11 max-w-full items-center gap-2 px-4 py-2 text-left font-medium transition-transform duration-300 hover:-translate-y-px disabled:opacity-60"
                      >
                        <span className="min-w-0 [overflow-wrap:anywhere]">{answerText(s)}</span>
                        <Icon name="pen" className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  ) : null}
                </Fragment>
              );
            })}
            {composing || saving ? (
              <li className="flex" aria-hidden>
                <span className="bubble-kata inline-flex px-4 py-3.5">
                  <span className="typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              </li>
            ) : null}
            {saveError && !saving ? (
              <li className="appear flex">
                <p role="alert" className="bubble-kata max-w-[38ch] px-4 py-2.5 leading-snug">
                  That didn’t save: {saveError} Try again?
                </p>
              </li>
            ) : null}
          </ol>
          <p aria-live="polite" className="sr-only">
            {said}
          </p>
        </section>

        {/* Stretches to the conversation's height so the panel inside can stay in view. */}
        <div className="hidden min-w-0 lg:col-span-5 lg:block lg:self-stretch">
          {/* Padding inside the scroller leaves room for the cards' hard shadows. */}
          <div className="sticky top-4 -m-2 max-h-[calc(100svh-2rem)] overflow-y-auto p-2 pb-3 pr-3 [scrollbar-width:thin]">
            <LivePanel
              today={today}
              preset={preset}
              kept={kept}
              focus={focus}
              interests={interests}
              checkIn={at > steps.indexOf("checkin") ? checkIn : null}
              handle={claimed}
              companion={companion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
