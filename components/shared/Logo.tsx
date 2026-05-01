export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span
        aria-hidden
        className="font-serif italic text-2xl text-accent leading-none translate-y-[1px]"
      >
        型
      </span>
      <span className="font-serif italic text-xl tracking-tight">Kata</span>
    </span>
  );
}
