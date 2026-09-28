"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { startInterview } from "@/lib/actions/interview";
import { INTERVIEW_TYPES } from "@/lib/model";

export function InterviewLauncher({ mode }: { mode: string }) {
  const router = useRouter();
  const [value, setValue] = useState(mode);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <select className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink sm:w-48" value={value} onChange={(event) => setValue(event.target.value)}>
        {INTERVIEW_TYPES.map((item) => <option key={item}>{item}</option>)}
      </select>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await startInterview({ mode: value });
            if (!result.ok) setError(result.error);
            else router.push(`/interview/${result.id}`);
          })
        }
      >
        {pending ? "Starting…" : "Start interview"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
