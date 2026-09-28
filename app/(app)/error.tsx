"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold">This page hit an error</h2>
      <p className="mt-2 text-sm text-muted">{error.message || "Try again in a moment."}</p>
      <Button className="mt-4" type="button" onClick={() => reset()}>Try again</Button>
    </div>
  );
}
