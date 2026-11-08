"use client";

import { useState } from "react";
import { useToast } from "@/components/shared/Toast";
import { PublicSwitch } from "./PublicSwitch";

/** Whether friends see when you're here and typing. It saves as soon as it's flipped. */
export function ActiveSwitch({ initial }: { initial: boolean }) {
  const { toast } = useToast();
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function change(next: boolean) {
    setOn(next);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showActive: next }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setOn(!next);
      toast("That didn’t save. Try again.", "danger");
      return;
    }
    toast(next ? "Friends can see when you’re here." : "Nobody sees when you’re here now.", "success");
  }

  return (
    <PublicSwitch
      id="show-active"
      label="Show when I’m active"
      on={on}
      onChange={change}
      disabled={saving}
      copy={{
        on: "Friends you can message see when you’re here and when you’re typing. Turn it off and you won’t see theirs either.",
        off: "Nobody sees when you’re here or typing, and you don’t see anyone’s.",
      }}
    />
  );
}
