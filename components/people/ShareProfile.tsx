"use client";

/**
 * ShareProfile — shares the writer's own profile link (kata-day.vercel.app/@handle), which opens
 * a card anyone can see, signed in or not, and shows a picture of it when pasted into a chat.
 * Phones get the system share sheet; elsewhere the link is copied.
 */

import { Button, type ButtonVariant } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";

export function profileLink(handle: string) {
  return `${window.location.origin}/@${handle}`;
}

export function ShareProfile({ handle, name, variant = "secondary", className = "" }: { handle: string; name: string; variant?: ButtonVariant; className?: string }) {
  const { toast } = useToast();

  async function share() {
    const url = profileLink(handle);
    const data = { title: `${name} on Kata`, text: `Follow me on Kata`, url };
    // The share sheet, where there is one: copying a link on a phone is two more steps.
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches && (navigator.canShare?.(data) ?? true)) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied. Paste it to a friend.", "success");
    } catch {
      toast(`Your link: ${url}`);
    }
  }

  return (
    <Button variant={variant} onClick={share} className={className}>
      <Icon name="share" className="h-4 w-4" />
      Share your profile
    </Button>
  );
}
