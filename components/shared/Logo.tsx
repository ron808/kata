import { Seal } from "./Seal";

export function Logo({
  className = "",
  cut,
}: {
  className?: string;
  cut?: "ground" | "surface" | "raised";
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Seal size={26} cut={cut} />
      <span className="font-display text-[1.7rem] leading-none tracking-[-0.035em]">Kata</span>
    </span>
  );
}
