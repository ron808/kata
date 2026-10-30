import type { ReactNode } from "react";

const WIDTHS = {
  wide: "max-w-[72rem]",
  text: "max-w-[46rem]",
};

/** The content column of every signed-in page. */
export function AppPage({
  width = "wide",
  className = "",
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full px-margin pb-20 pt-[clamp(1.75rem,4.5vw,3.75rem)] ${WIDTHS[width]} ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0 max-w-2xl">
        {kicker ? <p className="text-[0.9375rem] font-medium text-ink/70">{kicker}</p> : null}
        <h1 className={`font-display text-display-m ${kicker ? "mt-2" : ""}`}>{title}</h1>
        {lede ? <p className="mt-4 text-lede text-ink/75">{lede}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** A labelled band inside a page: a quiet heading with an optional link on the right. */
export function Section({
  title,
  action,
  children,
  className = "",
  id,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id={id} className="font-display text-display-s">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** An empty state, written as a sentence, on a dashed sticker outline. */
export function EmptyNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-edge/50 px-6 py-12 text-center">
      <p className="mx-auto max-w-md text-ink/75">{children}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
