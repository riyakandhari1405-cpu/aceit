"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { generatePortfolio } from "@/lib/actions/portfolio";

export function GeneratePortfolio() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await generatePortfolio(true);
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Generating…" : "Generate portfolio"}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
