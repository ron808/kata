import Link from "next/link";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";

/**
 * The page's call to action. Signed-in visitors (html[data-session="in"], set by
 * SessionCheck) see "Open Kata" instead. Both links share one grid cell and the shown
 * one stretches to it, so the swap never moves anything; the hidden one is invisible,
 * so it can't be focused.
 *
 * `big` marks the hero and closing CTAs: while neither is on screen, the header's
 * CTA lights up as the view's one primary action (`lit`, wired in Scenes).
 */
export function StartLink({
  label = "Start writing",
  variant = "primary",
  size = "md",
  arrow = false,
  big = false,
  lit = false,
  className = "",
}: {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
  big?: boolean;
  lit?: boolean;
  className?: string;
}) {
  const look = buttonClass({
    variant,
    size,
    className: `[grid-area:1/1] ${lit ? "group-data-[lit]:bg-accent group-data-[lit]:text-on-accent" : ""}`,
  });
  const icon = arrow ? <Icon name="arrow" className="h-[1.1rem] w-[1.1rem]" /> : null;
  return (
    <span
      data-cta-big={big || undefined}
      data-cta-lit={lit || undefined}
      className={`group inline-grid ${className}`}
    >
      <Link href="/register" className={`${look} [html[data-session=in]_&]:invisible`}>
        {label}
        {icon}
      </Link>
      <Link href="/dashboard" className={`${look} invisible [html[data-session=in]_&]:visible`}>
        Open Kata
        {icon}
      </Link>
    </span>
  );
}
