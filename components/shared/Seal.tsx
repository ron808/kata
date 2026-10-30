import type { CSSProperties } from "react";

// The brand mark: a vermilion hanko with 型 (kata: form, pattern) cut out of it.
// The glyph is drawn in the colour of whatever the seal sits on (--seal-cut),
// so it reads as carved out of the ink. Defaults to the page ground.
const GLYPH = [
  // 开
  [18, 17, 38, 8],
  [15, 33, 44, 8],
  [24, 17, 8, 35],
  [41, 17, 8, 35],
  // 刂
  [65, 21, 7, 24],
  [78, 14, 8, 40],
  [72, 47, 14, 7],
  // 土
  [30, 63, 40, 8],
  [46, 57, 8, 27],
  [15, 79, 70, 8],
] as const;

export function Seal({
  size = 28,
  className = "",
  cut,
  title,
  style,
}: {
  size?: number | string;
  className?: string;
  /** Colour of the carved glyph; match the surface the seal sits on. */
  cut?: "ground" | "surface" | "raised";
  title?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={cut ? { ...style, ["--seal-cut" as string]: `var(--${cut})` } : style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="94" height="94" rx="19" fill="var(--accent)" />
      <g fill="var(--seal-cut, var(--ground))">
        {GLYPH.map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} />
        ))}
      </g>
    </svg>
  );
}
