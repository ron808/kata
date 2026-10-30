"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";

export function SignOutButton() {
  const [leaving, setLeaving] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        void signOut({ callbackUrl: "/" });
      }}
    >
      <Icon name="signout" className="h-4 w-4" />
      {leaving ? "Signing out…" : "Sign out"}
    </Button>
  );
}
