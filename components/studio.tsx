"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, fieldClass, Field } from "@/components/ui";
import { INTERVIEW_TYPES } from "@/lib/model";
import { saveTarget } from "@/lib/actions/target";
import { useActionState } from "react";

export function PrepareForm({
  companies,
  roles,
  company,
  role,
  interviewType,
}: {
  companies: string[];
  roles: string[];
  company: string;
  role: string;
  interviewType: string;
}) {
  const [state, action, pending] = useActionState(saveTarget, null);
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-2">
      <Field label="Company">
        <input className={fieldClass} name="company" list="companies" defaultValue={company} placeholder="Schneider Electric" required />
        <datalist id="companies">
          {companies.map((item) => <option key={item} value={item} />)}
        </datalist>
      </Field>
      <Field label="Role">
        <input className={fieldClass} name="role" list="roles" defaultValue={role} placeholder="Software Engineer" required />
        <datalist id="roles">
          {roles.map((item) => <option key={item} value={item} />)}
        </datalist>
      </Field>
      <Field label="Interview type">
        <select className={fieldClass} name="interviewType" defaultValue={interviewType || "Technical"}>
          {INTERVIEW_TYPES.map((type) => <option key={type}>{type}</option>)}
        </select>
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Set as active goal"}</Button>
      </div>
      {state?.error ? <p className="text-sm text-danger md:col-span-2">{state.error}</p> : null}
      {state?.saved ? <p className="text-sm text-muted md:col-span-2">This goal is now active across AceIt.</p> : null}
    </form>
  );
}

export function QuestionStudio({
  interviewType,
  stale,
}: {
  interviewType: string;
  stale: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState(interviewType);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Interview type">
          <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
            {INTERVIEW_TYPES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const { runQuestions } = await import("@/lib/actions/prepare-ai");
              const result = await runQuestions({ interviewType: type, force: !stale ? true : true });
              if (!result.ok) setError(result.error);
              else {
                setError("");
                setNote(result.message);
                setWarning(result.warning || "");
                router.refresh();
              }
            })
          }
        >
          {pending ? "Writing questions…" : stale ? "Generate questions" : "Regenerate"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
      {warning ? <p className="mt-1 text-xs text-muted">{warning}</p> : null}
    </div>
  );
}

export function PracticeButton({ questionId, mode }: { questionId?: string; mode: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <Button
        type="button"
        variant={questionId ? "secondary" : "primary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const { startInterview } = await import("@/lib/actions/interview");
            const result = await startInterview({ mode, questionId });
            if (!result.ok) setError(result.error);
            else router.push(`/interview/${result.id}`);
          })
        }
      >
        {pending ? "Starting…" : questionId ? "Practice this" : "Start mock interview"}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function AnalysisRunner({ stale }: { stale: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const { runAnalysis } = await import("@/lib/actions/prepare-ai");
            const result = await runAnalysis(true);
            if (!result.ok) setError(result.error);
            else {
              setError("");
              setNote(result.message);
              setWarning(result.warning || "");
              router.refresh();
            }
          })
        }
      >
        {pending ? "Analyzing…" : stale ? "Run analysis" : "Refresh analysis"}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
      {warning ? <p className="mt-1 text-xs text-muted">{warning}</p> : null}
    </div>
  );
}
