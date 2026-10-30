import type { CSSProperties } from "react";
import { FIELD_TYPE_META } from "@/components/builder/fieldTypes";
import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";

/**
 * A page drawn small: each question with a hint of its answer (lines to write
 * on, five dots, five bolts). Not interactive; FormPreview is the one you can try.
 */
export function MiniPage({
  name,
  fields,
  max,
  tilt = 0,
  tape,
  more = true,
  className = "",
}: {
  name?: string;
  fields: TemplateField[];
  /** Show at most this many questions, then "and N more". */
  max?: number;
  /** Say how many are left out (off when the page is tucked into something). */
  more?: boolean;
  tilt?: number;
  /** A hue for washi tape across the top. */
  tape?: number;
  className?: string;
}) {
  const shown = max ? fields.slice(0, max) : fields;
  const rest = fields.length - shown.length;
  return (
    <div
      className={`relative rounded-md border-2 border-edge bg-surface px-4 pb-4 pt-4 ${className}`}
      style={{ rotate: `${tilt}deg` } as CSSProperties}
    >
      {tape !== undefined ? <span className="tape" data-hue={tape} aria-hidden /> : null}
      {name ? <p className="truncate font-display text-[1.25rem] leading-none">{name}</p> : null}
      <ol className={`space-y-3 ${name ? "mt-3.5" : ""}`}>
        {shown.map((f) => (
          <li key={f.id} className="min-w-0">
            {f.type === "divider" ? (
              <Divider label={f.config?.sectionLabel as string | undefined} />
            ) : (
              <>
                <p className="flex min-w-0 items-center gap-1.5 text-[0.875rem] font-semibold leading-snug">
                  <Icon name={FIELD_TYPE_META[f.type].icon} className="h-3.5 w-3.5 text-ink/65" strokeWidth={2} />
                  <span className="truncate">{f.label}</span>
                  {f.required ? (
                    <span aria-hidden className="text-[0.6rem] text-accent">
                      ●
                    </span>
                  ) : null}
                </p>
                <Answer field={f} />
              </>
            )}
          </li>
        ))}
      </ol>
      {more && rest > 0 ? <p className="mt-3 text-[0.8125rem] font-semibold text-ink/65">and {rest} more</p> : null}
    </div>
  );
}

function Divider({ label }: { label?: string }) {
  return (
    <div aria-hidden className="flex items-center gap-2 py-0.5 text-[0.8125rem] font-semibold text-ink/65">
      <span className="h-0 flex-1 border-t-2 border-dashed border-ink/20" />
      {label ? <span className="truncate">{label}</span> : null}
      <span className="h-0 flex-1 border-t-2 border-dashed border-ink/20" />
    </div>
  );
}

const lines = (n: number) => (
  <span aria-hidden className="mt-1.5 block space-y-2">
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className={`block h-0 border-b-2 border-ink/15 ${i === n - 1 && n > 1 ? "w-3/5" : ""}`} />
    ))}
  </span>
);

const row = (children: React.ReactNode) => (
  <span aria-hidden className="mt-1.5 flex items-center gap-1 text-ink/45">
    {children}
  </span>
);

function Answer({ field }: { field: TemplateField }) {
  switch (field.type) {
    case "long_text":
      return lines(2);
    case "short_text":
    case "link":
      return lines(1);
    case "mood_slider":
      return row([0, 1, 2, 3, 4].map((i) => <span key={i} className="h-3.5 w-3.5 rounded-full border-2 border-current" />));
    case "energy":
      return row([0, 1, 2, 3, 4].map((i) => <Icon key={i} name="bolt" className="h-3.5 w-3.5" strokeWidth={2} />));
    case "rating":
      return row([0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" className="h-3.5 w-3.5" strokeWidth={2} />));
    case "number":
      return row(
        <>
          <span className="h-5 w-10 rounded-[6px] border-2 border-current" />
          {field.config?.unit ? <span className="text-[0.8125rem] font-semibold text-ink/65">{String(field.config.unit)}</span> : null}
        </>
      );
    case "yes_no":
      return row(
        <>
          <span className="rounded-full border-2 border-current px-2 text-[0.8125rem] font-semibold leading-[1.15rem] text-ink/65">
            {(field.config?.yesLabel as string) || "Yes"}
          </span>
          <span className="rounded-full border-2 border-current px-2 text-[0.8125rem] font-semibold leading-[1.15rem] text-ink/65">
            {(field.config?.noLabel as string) || "No"}
          </span>
        </>
      );
    case "tags":
      return row(
        <>
          <span className="h-5 w-12 rounded-full border-2 border-current" />
          <span className="h-5 w-9 rounded-full border-2 border-current" />
        </>
      );
    default:
      return null;
  }
}
