import type { ReactNode } from "react";

/** A field's label, written as the question you ask yourself each day. */
export function FieldPrompt({
  children,
  htmlFor,
  id,
  as = "label",
  className = "",
}: {
  children: ReactNode;
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
    </Tag>
  );
}
