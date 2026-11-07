"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";

/** Share your page's questions in the gallery so others can copy them. Pages themselves stay private. */
export function PublishToggle({
  templateId,
  isPublished,
  credit = false,
}: {
  templateId: string;
  isPublished: boolean;
  /** The gallery shows who made it. */
  credit?: boolean;
  /** Kept for callers; the gallery finds a page by it. */
  publishedSlug?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [named, setNamed] = useState(credit);

  async function toggleCredit() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credit: !named }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error);
      }
      setNamed(!named);
      toast(named ? "Your name is off it" : "Your name is on it in the gallery", "success");
      router.refresh();
    } catch (err) {
      toast((err instanceof Error && err.message) || "Couldn’t change that. Try again.", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn’t change that. Try again.");
      }
      toast(isPublished ? "Taken out of the gallery" : "Shared in the gallery", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn’t change that. Try again.", "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name={isPublished ? "globe" : "gallery"} className="h-4 w-4" />
          {isPublished ? "In the gallery" : "Share in the gallery"}
        </p>
        <p className="mt-1 text-sm text-ink/70">
          {isPublished
            ? "Others can copy your questions from the gallery. What you write stays private."
            : "Only the questions are shared, never what you write."}
        </p>
      </div>
      <Button variant="secondary" onClick={toggle} disabled={loading} aria-pressed={isPublished}>
        {loading ? "Saving…" : isPublished ? "Take it down" : "Share it"}
      </Button>
      {isPublished ? (
        <button type="button" role="switch" aria-checked={named} onClick={toggleCredit} disabled={loading} className="chip chip-sm basis-full justify-start whitespace-normal py-1.5 text-left sm:basis-auto">
          <Icon name={named ? "check" : "user"} className="h-4 w-4" />
          {named ? "Your name is on it: people can open your profile from it" : "Put my name on it, so people can find your profile from it"}
        </button>
      ) : null}
    </div>
  );
}
