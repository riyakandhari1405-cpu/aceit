"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, fieldClass } from "@/components/ui";
import { finishInterview, submitAnswer } from "@/lib/actions/interview";

type Turn = { id: string; text: string; source: string; answer: string | null };

const PLANNED = 6;

export function InterviewRoom({
  sessionId,
  company,
  role,
  mode,
  status,
  questions,
}: {
  sessionId: string;
  company: string;
  role: string;
  mode: string;
  status: string;
  questions: Turn[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [nexting, startNext] = useTransition();
  const [ending, startEnd] = useTransition();
  const pending = nexting || ending;
  const answered = questions.filter((question) => question.answer).length;
  const current = questions.find((question) => !question.answer) ?? null;
  const step = current ? answered + 1 : Math.max(answered, 1);
  const progress = Math.min(100, Math.round((answered / PLANNED) * 100));
  const open = Boolean(current) && status !== "ready";

  function send() {
    if (!draft.trim() || pending) return;
    startNext(async () => {
      const result = await submitAnswer(sessionId, draft);
      if (!result.ok) setError(result.error);
      else {
        setDraft("");
        setError("");
        router.refresh();
      }
    });
  }

  function end() {
    startEnd(async () => {
      const result = await finishInterview(sessionId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-copper">{company}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{role}</h1>
        <p className="mt-1 text-sm text-muted">{mode} interview</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Question {step}</span>
          <span className="text-muted">{answered} answered</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-copper transition-[width]" style={{ width: `${status === "ready" ? 100 : progress}%` }} />
        </div>
      </div>

      <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 md:p-6">
        {current ? (
          <>
            <p className="text-xs text-copper">{current.source}</p>
            <p className="mt-2 text-lg leading-7">{current.text}</p>
          </>
        ) : (
          <p className="text-lg leading-7">That covers this round. End the interview to see your score.</p>
        )}
        {nexting ? <p className="mt-4 text-sm text-muted">Preparing the next question…</p> : null}
      </section>

      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <textarea
            className={`${fieldClass} min-h-32`}
            value={draft}
            placeholder="Answer in your own words. Name the project, the choice, and the result."
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" disabled={pending || answered === 0} onClick={end}>
              {ending ? "Scoring…" : "End interview"}
            </Button>
            <Button type="submit" disabled={pending || !draft.trim()}>
              {nexting ? "Next question…" : "Next question"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button type="button" disabled={pending} onClick={end}>
            {ending ? "Scoring…" : "End interview"}
          </Button>
        </div>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
