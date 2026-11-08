/**
 * Kata's own stickers for messages. They're drawn in code (`components/messages/Sticker.tsx`), so a
 * sticker message stores only its id and nothing is ever uploaded. Each wears a hue like everything
 * else. Ids are stored in messages: never rename or reuse one.
 */
export type StickerKind = "face" | "word" | "thing";

export interface StickerDef {
  id: string;
  label: string;
  kind: StickerKind;
  hue: number;
}

export const STICKERS: readonly StickerDef[] = [
  { id: "happy", label: "Happy", kind: "face", hue: 1 },
  { id: "laughing", label: "Laughing", kind: "face", hue: 7 },
  { id: "love", label: "In love", kind: "face", hue: 5 },
  { id: "wow", label: "Wow", kind: "face", hue: 2 },
  { id: "sad", label: "Sad", kind: "face", hue: 4 },
  { id: "sleepy", label: "Sleepy", kind: "face", hue: 6 },
  { id: "cool", label: "Cool", kind: "face", hue: 3 },
  { id: "shy", label: "Shy", kind: "face", hue: 0 },
  { id: "yay", label: "Yay", kind: "word", hue: 1 },
  { id: "same", label: "Same", kind: "word", hue: 2 },
  { id: "lol", label: "Lol", kind: "word", hue: 3 },
  { id: "you-got-this", label: "You got this", kind: "word", hue: 0 },
  { id: "proud-of-you", label: "Proud of you", kind: "word", hue: 4 },
  { id: "miss-you", label: "Miss you", kind: "word", hue: 5 },
  { id: "thank-you", label: "Thank you", kind: "word", hue: 6 },
  { id: "good-night", label: "Good night", kind: "word", hue: 7 },
  { id: "heart", label: "Heart", kind: "thing", hue: 0 },
  { id: "star", label: "Star", kind: "thing", hue: 1 },
  { id: "flame", label: "Flame", kind: "thing", hue: 7 },
  { id: "sprout", label: "Sprout", kind: "thing", hue: 3 },
  { id: "moon", label: "Moon", kind: "thing", hue: 4 },
  { id: "coffee", label: "Coffee", kind: "thing", hue: 6 },
];

export const STICKER_IDS = STICKERS.map((s) => s.id) as [string, ...string[]];

export const stickerOf = (id: string | null | undefined): StickerDef | undefined => (id ? STICKERS.find((s) => s.id === id) : undefined);
