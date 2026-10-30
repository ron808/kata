import type { CSSProperties, ReactNode } from "react";

/**
 * A round sticker in a thread's (or a person's) hue: ink outline, hard shadow, a small
 * tilt because it's stuck on. Decorative unless the caller gives it a role.
 */
export function Sticker({
  hue,
  size,
  tilt = 0,
  fontSize = "0.95rem",
  className = "",
  style,
  children,
}: {
  hue: number;
  /** Any CSS length: "7rem", "22cqi"… */
  size: string;
  tilt?: number;
  /** The label scales with this; the line under it never drops below 12px. */
  fontSize?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <span
      data-hue={((hue % 8) + 8) % 8}
      className={`grid aspect-square place-items-center content-center rounded-full border-[2.5px] border-edge bg-hue p-[0.55em] text-center text-on-hue shadow-sticker ${className}`}
      style={{ width: size, rotate: `${tilt}deg`, fontSize, ...style }}
    >
      {children}
    </span>
  );
}

/** A sticker's label: a name in display type and an optional line under it. */
export function StickerLabel({ title, meta }: { title: string; meta?: string }) {
  return (
    <>
      <span className="line-clamp-3 font-display leading-[1.02] tracking-[-0.01em] [overflow-wrap:anywhere]">{title}</span>
      {meta ? (
        <span className="mt-[0.3em] block text-[max(0.75rem,0.8em)] font-semibold leading-tight opacity-85">{meta}</span>
      ) : null}
    </>
  );
}
