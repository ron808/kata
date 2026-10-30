import type { ReactNode } from "react";

/** A field's label, written as the question you ask yourself each day. */
export function FieldPrompt({
  children,
  required,
  htmlFor,
  id,
  as = "label",
  className = "",
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  id?: string;
  as?: "label" | "p" | "h2" | "h3";
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag
      id={id}
      htmlFor={as === "label" ? htmlFor : undefined}
      className={`block font-display text-prompt text-ink ${className}`}
    >
      {children}
      {required ? (
        <span className="ml-2 inline-flex translate-y-[-0.12em] items-center rounded-full bg-ink/[0.07] px-2 py-0.5 align-middle font-sans text-[0.8125rem] font-semibold tracking-normal text-ink/70">
          Required
        </span>
      ) : null}
    </Tag>
  );
}
