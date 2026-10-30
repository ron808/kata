import type { IChoice, IChoiceInput } from "@/lib/db/models/CompanionMessage";
import type { IThread } from "@/lib/db/models/Thread";
import { valueText } from "./fields";

/**
 * Forms on Maru's choices. When a tool needs something the writer hasn't said (what the habit
 * is, how far they walked), Maru doesn't ask in words: the choice carries the inputs, prefilled
 * with what it knows, and the writer's tap runs it with what they filled in. No model is
 * involved after the form is offered, so filling one in costs no tokens.
 */

type Args = Record<string, unknown>;

export function input(key: string, label: string, type: IChoiceInput["type"], o: Partial<IChoiceInput> = {}): IChoiceInput {
  return { key, label, type, value: "", options: [], required: false, unit: "", placeholder: "", ...o };
}

export const ideas = (items: string[]) => items.map((s) => ({ label: s.slice(0, 60), value: s.slice(0, 60) }));

/** Nothing it needs is missing, and there's something to run it with: one tap can do it. */
export const complete = (inputs: IChoiceInput[]) => inputs.every((i) => !i.required || i.value.trim()) && inputs.some((i) => i.value.trim());

/** Logging a thread's numbers (and words) for today, as a form. Null when it keeps none. */
export function logChoice(t: Pick<IThread, "title" | "fields">, values: Args = {}): IChoice | null {
  const fields = t.fields ?? [];
  if (!fields.length) return null;
  return {
    label: `Log ${t.title}`,
    detail: "",
    kind: "thread",
    tool: "log_thread",
    args: { thread: t.title },
    editable: false,
    public: false,
    inputs: fields.map((f) =>
      input(`values.${f.label}`, f.label, f.type === "text" ? "text" : "number", {
        unit: f.unit,
        value: values[f.label] === undefined || values[f.label] === null ? "" : String(values[f.label]),
        placeholder: f.goal ? `Goal ${f.goal}` : f.type === "text" ? String(f.value ?? "") : "",
      })
    ),
    action: "Log it",
  };
}

function setPath(args: Args, key: string, value: unknown) {
  const [head, rest] = key.split(/\.(.*)/);
  if (!rest) {
    args[head] = value;
    return;
  }
  const inner = args[head] && typeof args[head] === "object" ? { ...(args[head] as Args) } : {};
  if (value === undefined) delete inner[rest];
  else inner[rest] = value;
  args[head] = inner;
}

/**
 * The choice's arguments with what the writer filled in, each checked against its input.
 * Anything not in the form is ignored; a value that doesn't fit its input is an error.
 */
export function applyInputs(choice: Pick<IChoice, "args" | "inputs">, filled: Record<string, string> = {}): { args: Args } | { why: string } {
  const args: Args = { ...choice.args };
  let any = false;
  for (const inp of choice.inputs ?? []) {
    const raw = filled[inp.key] ?? inp.value;
    const v = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!v) {
      if (inp.required) return { why: `Fill in ${inp.label.toLowerCase()} first.` };
      // Cleared: a list or a date that was suggested goes; a value is just not logged.
      setPath(args, inp.key, inp.type === "list" || inp.type === "date" ? "" : undefined);
      continue;
    }
    if (inp.type === "number") {
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || Math.abs(n) > 1e7) return { why: `${inp.label} needs a number.` };
      setPath(args, inp.key, n);
    } else if (inp.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { why: `${inp.label} needs a date.` };
      setPath(args, inp.key, v);
    } else if (inp.type === "pick") {
      if (!inp.options.some((o) => o.value === v)) return { why: `Pick one for ${inp.label.toLowerCase()}.` };
      setPath(args, inp.key, v);
    } else {
      setPath(args, inp.key, v);
    }
    any = true;
  }
  if (choice.inputs?.length && !any) return { why: "Fill something in first." };
  return { args };
}

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** What the writer's tap says in the conversation: what they filled in, or the choice's label. */
export function saidFor(choice: Pick<IChoice, "label" | "inputs">, filled: Record<string, string> = {}): string {
  const parts = (choice.inputs ?? []).flatMap((inp) => {
    const v = String(filled[inp.key] ?? inp.value ?? "").trim();
    if (!v || inp.type === "list") return [];
    if (inp.type === "number") return [valueText({ label: inp.label, unit: inp.unit, type: "number" }, Number(v.replace(",", ".")))];
    if (inp.type === "date") return [day(v)];
    if (inp.type === "pick") return [inp.options.find((o) => o.value === v)?.label ?? v];
    return [v];
  });
  return (parts.length ? parts.join(" · ") : choice.label).slice(0, 200);
}
