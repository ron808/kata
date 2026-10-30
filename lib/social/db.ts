import { Types } from "mongoose";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** A 24-hex id. `Types.ObjectId.isValid` also accepts any 12-character string. */
export function isObjectId(value: string): boolean {
  return OBJECT_ID.test(value);
}

export function objectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

/** A unique index refused the write, so the document already exists. */
export function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}
