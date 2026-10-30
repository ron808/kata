/**
 * A person's own seal, as opposed to Kata's. Kata's seal is solid vermilion with 型 cut
 * out; a person's seal is a vermilion frame with their initial written in it (a red-ink
 * "shubun" seal). States: "inked" (they wrote / signed), "blank" (not yet), "resting".
 */
export function PersonSeal({
  initial,
  size = 36,
  state = "inked",
  className = "",
  title,
}: {
  initial: string;
  size?: number;
  state?: "inked" | "blank" | "resting";
  className?: string;
  title?: string;
}) {
  const tone =
    state === "inked"
      ? "border-accent text-accent"
      : state === "resting"
        ? "border-ink/25 text-ink/40"
        : "border-dashed border-ink/25 text-ink/35";
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-grid shrink-0 place-items-center rounded-[22%] border-[max(1.5px,0.07em)] font-display leading-none ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.62, borderWidth: Math.max(1.5, size * 0.07) }}
    >
      <span className="translate-y-[0.04em]">{initial}</span>
    </span>
  );
}
