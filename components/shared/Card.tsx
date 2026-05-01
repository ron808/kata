import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

export function Card({ className = "", hoverable, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-bg-surface ${
        hoverable
          ? "transition-colors hover:border-border-strong"
          : ""
      } ${className}`}
      {...rest}
    />
  );
}
