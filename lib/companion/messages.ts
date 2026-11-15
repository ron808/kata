import { createHash } from "node:crypto";
import { Types } from "mongoose";
import {
  CompanionMessage,
  type IChoice,
  type ICompanionMessage,
  type IQuickReply,
  type IReceipt,
  type MessageKind,
} from "@/lib/db/models/CompanionMessage";
import type { KataMessage, PlanRow } from "@/lib/types";

export const MOOD_REPLIES: IQuickReply[] = [
  { label: "Foggy", value: "1" },
  { label: "Low", value: "2" },
  { label: "Okay", value: "3" },
  { label: "Good", value: "4" },
  { label: "Bright", value: "5" },
];

/**
 * An _id derived from its parts. The day's opening set and the evening set use
 * one, so two requests racing on the first visit of the day collide on _id
 * instead of greeting the writer twice.
 */
export function stableId(...parts: string[]): Types.ObjectId {
  return new Types.ObjectId(createHash("sha1").update(parts.join(":")).digest("hex").slice(0, 24));
}

export interface Draft {
  from: "kata" | "you";
  kind: MessageKind;
  text: string;
  threadId?: Types.ObjectId | null;
  replies?: IQuickReply[];
  mood?: number | null;
  done?: IReceipt[];
  choices?: IChoice[];
  hello?: boolean;
  _id?: Types.ObjectId;
}

/** Builds the documents for a run of messages, a millisecond apart so they sort in order. */
function draftsToDocs(
  userId: string,
  day: string,
  drafts: Draft[],
  at: Date = new Date()
): ICompanionMessage[] {
  return drafts.map((d, i) => ({
    _id: d._id ?? new Types.ObjectId(),
    userId: new Types.ObjectId(userId),
    from: d.from,
    kind: d.kind,
    text: d.text.slice(0, 1000),
    threadId: d.threadId ?? null,
    replies: d.replies ?? [],
    answer: null,
    mood: d.mood ?? null,
    done: d.done ?? [],
    choices: d.choices ?? [],
    day,
    ...(d.hello ? { hello: true } : {}),
    createdAt: new Date(at.getTime() + i),
  }));
}

export async function insertDrafts(userId: string, day: string, drafts: Draft[]): Promise<ICompanionMessage[]> {
  if (!drafts.length) return [];
  const docs = draftsToDocs(userId, day, drafts);
  await CompanionMessage.insertMany(docs, { ordered: true });
  return docs;
}

export function isDuplicateKey(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: number; writeErrors?: { code?: number }[] };
  return e.code === 11000 || Boolean(e.writeErrors?.some((w) => w.code === 11000));
}

export async function messagesForDay(userId: string, day: string): Promise<ICompanionMessage[]> {
  return CompanionMessage.find({ userId, day }).sort({ createdAt: 1, _id: 1 }).lean<ICompanionMessage[]>();
}

/** A plan's rows as stored on its button, checked: anything malformed is left out. */
function planRows(rows: unknown[]): PlanRow[] {
  return rows.flatMap((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    if (typeof o.title !== "string" || !o.title) return [];
    return [{ time: typeof o.time === "string" ? o.time : "", title: o.title, minutes: typeof o.minutes === "number" ? o.minutes : 0, because: typeof o.because === "string" ? o.because : "", hue: typeof o.hue === "number" ? o.hue % 8 : 0 }];
  });
}

export function toKataMessage(m: ICompanionMessage): KataMessage {
  return {
    _id: String(m._id),
    from: m.from,
    kind: m.kind,
    ...(m.hello ? { hello: true } : {}),
    text: m.text,
    threadId: m.threadId ? String(m.threadId) : null,
    replies: (m.replies ?? []).map((r) => ({ label: r.label, value: r.value })),
    answer: m.answer ?? null,
    mood: m.mood ?? null,
    done: (m.done ?? []).map((d) => ({ kind: d.kind, text: d.text, detail: d.detail ?? "", href: d.href ?? null, hue: d.hue ?? null })),
    choices: (m.choices ?? []).map((c) => ({
      label: c.label,
      detail: c.detail ?? "",
      kind: c.kind,
      editable: Boolean(c.editable),
      public: Boolean(c.public),
      inputs: (c.inputs ?? []).map((i) => ({
        key: i.key,
        label: i.label,
        type: i.type,
        value: i.value ?? "",
        options: (i.options ?? []).map((o) => ({ label: o.label, value: o.value })),
        required: Boolean(i.required),
        unit: i.unit ?? "",
        placeholder: i.placeholder ?? "",
      })),
      action: c.action ?? "",
      max: c.max ?? 0,
      thread: c.tool === "thread" && typeof c.args?.id === "string" ? c.args.id : null,
      ...(c.tool === "start_mission" && Array.isArray(c.args?.plan) ? { plan: planRows(c.args.plan) } : {}),
    })),
    createdAt: new Date(m.createdAt).toISOString(),
  };
}
