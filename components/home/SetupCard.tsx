"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { KataMark } from "@/components/shared/Avatar";
import { Button, buttonClass } from "@/components/shared/Button";

const KEY = "kata-setup-later";
const subscribe = () => () => {};
const remembered = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** An invitation to set up the companion, which someone can turn down. */
export function SetupCard({ name }: { name: string }) {
  const later = useSyncExternalStore(subscribe, remembered, () => false);
  const [gone, setGone] = useState(false);
  if (later || gone) return null;
  return (
    <div className="card mt-8 flex flex-wrap items-center gap-4 p-4 sm:p-6">
      <KataMark size={44} />
      <p className="min-w-0 flex-1 basis-64 text-[1.0625rem]">
        <span className="font-semibold">Let’s get to know each other.</span> Two minutes with {name}: what you do, what’s on your
        plate, when to check in.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="quiet"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {}
            setGone(true);
          }}
        >
          Not now
        </Button>
        <Link href="/onboarding" className={buttonClass()}>
          Set it up
        </Link>
      </div>
    </div>
  );
}
