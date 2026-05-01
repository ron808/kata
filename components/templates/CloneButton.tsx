"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";

export function CloneButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function clone() {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/clone`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Clone failed");
      }
      toast("Template cloned & set as active", "success");
      router.push("/settings/template");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Clone failed", "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={clone} variant="secondary" size="sm" disabled={loading}>
      {loading ? "Cloning…" : "Clone & use"}
    </Button>
  );
}
