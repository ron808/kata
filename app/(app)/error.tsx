"use client";

import { useEffect } from "react";
import { Button } from "@/components/shared/Button";
import { AppPage, PageHeader } from "@/components/shared/AppPage";

/** Anything a signed-in page couldn't load, most often the database. */
export default function PageError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppPage width="text">
      <PageHeader title="This page didn’t load." lede="Nothing you’ve written is affected. Try it again in a moment." />
      <Button className="mt-8" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </AppPage>
  );
}
