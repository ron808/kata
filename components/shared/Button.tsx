import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

// Stickers press: hover lifts toward the light, active pushes into the shadow (.press).
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,color,transform,box-shadow] duration-300 ease-out " +
  "disabled:opacity-50 disabled:pointer-events-none";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-6 text-base",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "press border-2 border-edge bg-accent text-on-accent",
  secondary: "press border-2 border-edge bg-surface text-ink",
  quiet: "text-ink/75 hover:bg-ink/[0.06] hover:text-ink",
  danger: "press border-2 border-edge bg-surface text-bad",
};

/** Class names for anything that should look like a button (links included). */
export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...rest} />;
}
