import { stickerOf, type StickerDef } from "@/lib/stickers";

/**
 * One of Kata's stickers (`lib/stickers.ts`), drawn: faces and things in the same hand as Maru's mark
 * (a hue, the edge colour for lines and a hard shadow), words in the display face on their hue. Both
 * themes follow from the tokens.
 *
 *   <Sticker id="yay" size={112} />
 */
export function Sticker({ id, size = 112, className = "" }: { id: string; size?: number; className?: string }) {
  const s = stickerOf(id);
  if (!s) return null;
  if (s.kind === "word") return <Word s={s} size={size} className={className} />;
  return (
    <svg
      data-hue={s.hue}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${s.label} sticker`}
      className={`shrink-0 ${className}`}
    >
      {s.kind === "face" ? <Face id={s.id} /> : <Thing id={s.id} />}
    </svg>
  );
}

function Word({ s, size, className }: { s: StickerDef; size: number; className: string }) {
  return (
    <span
      data-hue={s.hue}
      role="img"
      aria-label={`${s.label} sticker`}
      className={`inline-grid place-items-center rounded-[1em] border-2 border-edge bg-hue px-[0.6em] py-[0.32em] text-center font-display leading-[0.95] text-on-hue shadow-sticker-sm ${className}`}
      style={{ fontSize: Math.round(size / 3.3), maxWidth: Math.round(size * 1.45) }}
    >
      {s.label}
    </span>
  );
}

const INK = "var(--on-hue)";
const EDGE = "var(--edge)";
const line = { fill: "none", stroke: INK, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Face({ id }: { id: string }) {
  const eyes = (
    <>
      <ellipse cx="35" cy="42" rx="5" ry="7" fill={INK} />
      <ellipse cx="61" cy="42" rx="5" ry="7" fill={INK} />
    </>
  );
  const cheeks = (fill = "var(--h5)", opacity = 0.55) => (
    <>
      <circle cx="26" cy="57" r="6.5" fill={fill} opacity={opacity} />
      <circle cx="70" cy="57" r="6.5" fill={fill} opacity={opacity} />
    </>
  );
  const smile = <path d="M35 58 Q48 70 61 58" {...line} />;
  let face;
  switch (id) {
    case "laughing":
      face = (
        <>
          <path d="M29 44 Q35 35 41 44" {...line} />
          <path d="M55 44 Q61 35 67 44" {...line} />
          {cheeks()}
          <path d="M32 55 Q48 80 64 55 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </>
      );
      break;
    case "love":
      face = (
        <>
          {[35, 61].map((x) => (
            <path
              key={x}
              transform={`translate(${x} 43)`}
              d="M0 7 C -12 -1 -10 -11 -4 -11 C -1 -11 0 -8 0 -6 C 0 -8 1 -11 4 -11 C 10 -11 12 -1 0 7 Z"
              fill="var(--h0)"
              stroke={EDGE}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          ))}
          {cheeks("var(--h0)", 0.3)}
          {smile}
        </>
      );
      break;
    case "wow":
      face = (
        <>
          <circle cx="35" cy="41" r="6" fill={INK} />
          <circle cx="61" cy="41" r="6" fill={INK} />
          <path d="M28 29 Q35 25 41 28" {...line} strokeWidth={4} />
          <path d="M55 28 Q61 25 68 29" {...line} strokeWidth={4} />
          <ellipse cx="48" cy="64" rx="6.5" ry="8.5" fill={INK} />
        </>
      );
      break;
    case "sad":
      face = (
        <>
          {eyes}
          <path d="M36 66 Q48 56 60 66" {...line} />
          <path d="M67 46 C 63 53 63 58 67 58 C 71 58 71 53 67 46 Z" fill="var(--h2)" stroke={EDGE} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      );
      break;
    case "sleepy":
      face = (
        <>
          <path d="M29 43 Q35 49 41 43" {...line} />
          <path d="M55 43 Q61 49 67 43" {...line} />
          {cheeks()}
          <path d="M43 62 Q48 66 53 62" {...line} />
          <path d="M70 13 h10 l-10 11 h10" fill="none" stroke={EDGE} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
    case "cool":
      face = (
        <>
          <rect x="24" y="34" width="21" height="14" rx="5" fill={INK} />
          <rect x="51" y="34" width="21" height="14" rx="5" fill={INK} />
          <path d="M45 39 h6" {...line} strokeWidth={4} />
          <path d="M37 61 Q49 68 61 58" {...line} />
        </>
      );
      break;
    case "shy":
      face = (
        <>
          <path d="M30 45 Q35 49 40 45" {...line} />
          <path d="M56 45 Q61 49 66 45" {...line} />
          {cheeks("var(--h5)", 0.8)}
          <path d="M41 62 q3.5 3.5 7 0 q3.5 -3.5 7 0" {...line} strokeWidth={4} />
        </>
      );
      break;
    default:
      face = (
        <>
          {eyes}
          {cheeks()}
          {smile}
        </>
      );
  }
  return (
    <>
      <circle cx="53" cy="53" r="41" fill={EDGE} />
      <circle cx="48" cy="48" r="41" fill="var(--hue)" stroke={EDGE} strokeWidth="5" />
      {face}
    </>
  );
}

/** A thing's main shape, its hard shadow, then any details on top. */
function Shape({ d, children }: { d: string; children?: React.ReactNode }) {
  return (
    <>
      <path d={d} transform="translate(5 5)" fill={EDGE} stroke={EDGE} strokeWidth="5" strokeLinejoin="round" />
      <path d={d} fill="var(--hue)" stroke={EDGE} strokeWidth="5" strokeLinejoin="round" />
      {children}
    </>
  );
}

function Thing({ id }: { id: string }) {
  switch (id) {
    case "heart":
      return <Shape d="M48 84 C 18 62 8 44 16 30 C 24 16 42 18 48 32 C 54 18 72 16 80 30 C 88 44 78 62 48 84 Z" />;
    case "star":
      return <Shape d="M48 9 L58 36 L86 37.5 L64 55 L71.5 82.5 L48 67 L24.5 82.5 L32 55 L10 37.5 L38 36 Z" />;
    case "flame":
      return (
        <Shape d="M48 88 C 24 88 16 68 24 52 C 30 40 38 36 36 16 C 52 24 60 38 58 50 C 62 46 64 40 64 36 C 74 46 78 58 74 70 C 70 82 60 88 48 88 Z">
          <path d="M48 82 C 39 82 35 73 39 65 C 42 59 47 57 47 49 C 55 55 58 63 57 70 C 56 77 53 82 48 82 Z" fill="var(--h1)" stroke={EDGE} strokeWidth="3" strokeLinejoin="round" />
        </Shape>
      );
    case "sprout":
      return (
        <>
          <path d="M48 76 V50" fill="none" stroke={EDGE} strokeWidth="5" strokeLinecap="round" />
          <path d="M48 54 C 30 54 18 44 18 28 C 34 28 46 38 48 54 Z" fill="var(--hue)" stroke={EDGE} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M48 48 C 52 30 66 20 84 22 C 84 38 70 48 48 48 Z" fill="var(--hue)" stroke={EDGE} strokeWidth="4.5" strokeLinejoin="round" />
          <rect x="34" y="78" width="38" height="16" rx="6" fill={EDGE} />
          <rect x="29" y="72" width="38" height="17" rx="6" fill="var(--h7)" stroke={EDGE} strokeWidth="4.5" />
        </>
      );
    case "moon":
      return (
        <Shape d="M62 12 C 38 16 24 36 26 56 C 28 76 46 90 68 86 C 48 80 38 64 40 46 C 42 30 50 20 62 12 Z">
          <path d="M76 22 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" fill="var(--h1)" stroke={EDGE} strokeWidth="2.5" strokeLinejoin="round" />
        </Shape>
      );
    case "coffee":
      return (
        <>
          <path d="M70 48 C 86 48 86 70 70 70" fill="none" stroke={EDGE} strokeWidth="5" strokeLinecap="round" />
          <Shape d="M20 40 H70 V64 C 70 79 60 87 45 87 C 30 87 20 79 20 64 Z" />
          <path d="M34 30 C 30 24 38 20 34 12 M48 30 C 44 24 52 20 48 12" fill="none" stroke={EDGE} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}
