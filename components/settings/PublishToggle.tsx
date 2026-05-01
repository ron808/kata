"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";

export function PublishToggle({
  templateId,
  isPublished,
  publishedSlug,
}: {
  templateId: string;
  isPublished: boolean;
  publishedSlug: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Toggle failed");
      }
      toast(isPublished ? "Unpublished" : "Published to gallery", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed", "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-sm font-medium">Publish to gallery</div>
        <div className="text-xs text-text-muted mt-0.5">
          {isPublished
            ? `Public at /templates · slug ${publishedSlug ?? "—"}`
            : "Anyone can clone your template once published."}
        </div>
      </div>
      <Button
        variant={isPublished ? "secondary" : "primary"}
        size="sm"
        onClick={toggle}
        disabled={loading}
      >
        {loading ? "…" : isPublished ? "Unpublish" : "Publish"}
      </Button>
    </div>
  );
}
