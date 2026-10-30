import { Seal } from "./Seal";

/** A person's round seal: their hue and their initial. */
export function Avatar({
  name,
  hue,
  size = 40,
  className = "",
}: {
  name: string;
  hue: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-hue={((hue % 8) + 8) % 8}
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

/** Kata's own seal: the app's mark, on its letters and starters. */
export function KataMark({ size = 36, cut = "surface" }: { size?: number; cut?: "ground" | "surface" | "raised" }) {
  return <Seal size={size} cut={cut} />;
}

/**
 * Maru, the companion: a round vermilion sticker with a face. Everything Maru says sits
 * beside this; the 型 seal stays Kata's own.
 */
export function MaruMark({ size = 36, className = "", title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {/* Its colour comes from [data-maru] (the writer's choice), else vermilion. */}
      <circle cx="50" cy="50" r="45" fill="var(--maru, var(--accent))" stroke="var(--edge)" strokeWidth="6" />
      <circle cx="27" cy="60" r="7" fill="var(--h5)" opacity="0.55" />
      <circle cx="73" cy="60" r="7" fill="var(--h5)" opacity="0.55" />
      <ellipse cx="37" cy="45" rx="5.5" ry="7.5" fill="var(--on-maru, var(--on-accent))" />
      <ellipse cx="63" cy="45" rx="5.5" ry="7.5" fill="var(--on-maru, var(--on-accent))" />
      <path d="M38 62 Q50 72 62 62" fill="none" stroke="var(--on-maru, var(--on-accent))" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}
