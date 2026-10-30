import type { Scene } from "./data";

export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A small ink print of a remembered day, laid in a paper mount with photo corners.
 * Drawn in sumi tones only, so it reads as a print in both themes.
 */
export function Print({ scene, caption, className = "" }: { scene: Scene; caption?: string; className?: string }) {
  return (
    <figure className={`bg-surface p-2 pb-0 shadow-paper ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-raised text-ink">
        <svg viewBox="0 0 160 120" className="block h-full w-full" aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
          <SceneArt scene={scene} />
          {/* Grain: a few soft speckles, like an old print. */}
          <g fill="currentColor" opacity="0.07">
            {[12, 37, 58, 81, 103, 129, 147].map((x, i) => (
              <circle key={x} cx={x} cy={(i * 37) % 110 + 6} r={0.9 + (i % 3) * 0.4} />
            ))}
          </g>
        </svg>
        {/* Photo corners. */}
        {["left-0 top-0", "right-0 top-0 rotate-90", "left-0 bottom-0 -rotate-90", "right-0 bottom-0 rotate-180"].map((pos) => (
          <span key={pos} aria-hidden className={`absolute h-3 w-3 ${pos}`}>
            <svg viewBox="0 0 12 12" className="h-full w-full text-ink/25">
              <path d="M0 0h12L0 12z" fill="currentColor" />
            </svg>
          </span>
        ))}
      </div>
      <figcaption className="px-0.5 py-2 text-[0.8125rem] leading-snug text-ink/65">{caption}</figcaption>
    </figure>
  );
}

function SceneArt({ scene }: { scene: Scene }) {
  if (scene === "lamp") {
    return (
      <g fill="currentColor">
        {/* Window with rooftops and a chimney. */}
        <rect x="92" y="20" width="56" height="70" opacity="0.1" />
        <path d="M92 74l10-8 8 5 9-10 12 9 8-6 9 7v19H92z" opacity="0.22" />
        <rect x="128" y="54" width="5" height="10" opacity="0.22" />
        <path d="M119 20v70M92 55h56" stroke="currentColor" strokeWidth="2" opacity="0.32" fill="none" />
        <rect x="92" y="20" width="56" height="70" fill="none" stroke="currentColor" strokeWidth="2.4" opacity="0.4" />
        {/* The lamp. */}
        <path d="M52 0v34" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <path d="M40 34h24l7 18H33z" opacity="0.62" />
        <ellipse cx="52" cy="62" rx="30" ry="10" opacity="0.06" />
        <path d="M37 52h30" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        {/* Table edge and a cup. */}
        <path d="M0 98h160v22H0z" opacity="0.16" />
        <path d="M38 88h14v8a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" opacity="0.4" />
        <path d="M52 90a3 3 0 0 1 0 6" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.4" />
      </g>
    );
  }
  if (scene === "pan") {
    return (
      <g fill="currentColor">
        <path d="M0 0h160v120H0z" opacity="0.03" />
        {/* Hob and kadai. */}
        <ellipse cx="80" cy="96" rx="58" ry="12" opacity="0.14" />
        <path d="M30 70h100c0 22-22 34-50 34S30 92 30 70z" opacity="0.55" />
        <ellipse cx="80" cy="70" rx="50" ry="9" opacity="0.32" />
        <path d="M22 66h10M128 66h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        {/* Seeds, popping. */}
        {[
          [62, 68],
          [70, 72],
          [79, 67],
          [88, 71],
          [96, 68],
          [74, 58],
          [90, 54],
          [83, 46],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i > 4 ? 1.6 : 1.9} opacity={i > 4 ? 0.45 : 0.7} />
        ))}
        {/* Steam. */}
        <path d="M66 40c-6-8 6-12 0-22M96 36c-6-8 6-12 0-22" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.28" strokeLinecap="round" />
        <path d="M120 30c10-4 20 2 26-4" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.18" />
      </g>
    );
  }
  return (
    <g fill="currentColor">
      {/* Sky, low sun, far shore of trees, the lake, a jetty. */}
      <circle cx="116" cy="40" r="11" opacity="0.16" />
      <path d="M0 62c8-6 12-10 18-6 6-8 12-4 16 0 6-10 14-6 18-2 8-6 14-2 20 1 6-6 14-6 20 0 8-5 16-3 22 2 8-5 16-4 22 0 8-2 16 0 24 1v8H0z" opacity="0.45" />
      <path d="M0 68h160v52H0z" opacity="0.14" />
      {[76, 84, 93, 103].map((y, i) => (
        <path key={y} d={`M${10 + i * 14} ${y}h${46 - i * 6}M${96 - i * 4} ${y + 3}h${36 + i * 5}`} stroke="currentColor" strokeWidth="1" opacity="0.22" />
      ))}
      <path d="M0 104l62-10h8l-58 26H0z" opacity="0.5" />
      <path d="M22 106v12M40 101v12M56 97v10" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
    </g>
  );
}

/** A pressed sprig, flattened and slightly translucent, tucked into a corner. */
export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 96" className={className} aria-hidden focusable="false">
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
        <path d="M30 94C31 70 33 48 38 26" fill="none" strokeWidth="1.3" opacity="0.55" />
        <path d="M32 66c-9-2-16-9-17-17 8 1 15 7 17 17zM34 52c8-4 13-12 13-19-7 2-12 10-13 19z" opacity="0.28" strokeWidth="0.6" />
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="38" cy="15" rx="5" ry="10" transform={`rotate(${r} 38 24)`} opacity="0.3" strokeWidth="0.6" />
        ))}
        <circle cx="38" cy="24" r="3.4" opacity="0.55" strokeWidth="0" />
      </g>
    </svg>
  );
}

/** A mood word, stamped in ink the way the page recorded it. */
export function MoodStamp({ mood, className = "" }: { mood: string; className?: string }) {
  return (
    <span className={`inline-flex -rotate-3 items-center rounded-sm border border-ink/30 px-2 py-0.5 font-display text-[1.05rem] leading-tight text-ink/75 ${className}`}>
      <span className="sr-only">Mood: </span>
      {mood}
    </span>
  );
}
