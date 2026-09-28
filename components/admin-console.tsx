"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, fieldClass, Field } from "@/components/ui";
import {
  deletePlacementExperience,
  deletePlacementQuestion,
  deletePlacementRecord,
  importPlacementCsv,
  saveOpenAiKey,
  savePlacementExperience,
  savePlacementQuestion,
  savePlacementRecord,
} from "@/lib/actions/admin";

type RecordRow = { id: string; company: string; role: string; year: string; college: string; selectedSkills: string; notes: string };
type QuestionRow = { id: string; company: string; role: string; roundType: string; question: string; topic: string };
type ExperienceRow = { id: string; company: string; role: string; roundType: string; experience: string };

export function AdminConsole({
  records,
  questions,
  experiences,
  ai,
}: {
  records: RecordRow[];
  questions: QuestionRow[];
  experiences: ExperienceRow[];
  ai: { enabled: boolean; source: string };
}) {
  const [tab, setTab] = useState<"records" | "questions" | "experiences" | "ai">("records");
  const [query, setQuery] = useState("");
  const needle = query.toLowerCase();
  const shownRecords = useMemo(() => records.filter((row) => `${row.company} ${row.role} ${row.selectedSkills}`.toLowerCase().includes(needle)), [records, needle]);
  const shownQuestions = useMemo(() => questions.filter((row) => `${row.company} ${row.role} ${row.question} ${row.topic}`.toLowerCase().includes(needle)), [questions, needle]);
  const shownExperiences = useMemo(() => experiences.filter((row) => `${row.company} ${row.role} ${row.experience}`.toLowerCase().includes(needle)), [experiences, needle]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          ["records", "Profiles"],
          ["questions", "Questions"],
          ["experiences", "Notes"],
          ["ai", "OpenAI"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-3 py-1.5 text-sm ${tab === id ? "bg-surface-2 text-ink" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab !== "ai" ? (
        <input className={fieldClass} value={query} placeholder="Filter by company, role, or text" onChange={(event) => setQuery(event.target.value)} />
      ) : null}
      {tab === "records" ? (
        <Editor
          kind="records"
          rows={shownRecords}
          blank={{ company: "", role: "", year: "", college: "", selectedSkills: "", notes: "" }}
          fields={[
            ["company", "Company"],
            ["role", "Role"],
            ["year", "Year"],
            ["college", "College"],
            ["selectedSkills", "Skills on the profile"],
            ["notes", "Interview notes"],
          ]}
          title={(row) => `${row.company} · ${row.role}`}
          detail={(row) => row.selectedSkills}
          save={savePlacementRecord}
          remove={deletePlacementRecord}
          template="/api/templates/records"
          columns="company, role, year, college, selectedSkills, notes"
        />
      ) : null}
      {tab === "questions" ? (
        <Editor
          kind="questions"
          rows={shownQuestions}
          blank={{ company: "", role: "", roundType: "", topic: "", question: "" }}
          fields={[
            ["company", "Company"],
            ["role", "Role"],
            ["roundType", "Round"],
            ["topic", "Topic"],
            ["question", "Question"],
          ]}
          title={(row) => row.question}
          detail={(row) => `${row.company} · ${row.role} · ${row.roundType} · ${row.topic}`}
          save={savePlacementQuestion}
          remove={deletePlacementQuestion}
          template="/api/templates/questions"
          columns="company, role, roundType, question, topic"
        />
      ) : null}
      {tab === "experiences" ? (
        <Editor
          kind="experiences"
          rows={shownExperiences}
          blank={{ company: "", role: "", roundType: "", experience: "" }}
          fields={[
            ["company", "Company"],
            ["role", "Role"],
            ["roundType", "Round"],
            ["experience", "What happened in the interview"],
          ]}
          title={(row) => `${row.company} · ${row.role}`}
          detail={(row) => row.experience}
          save={savePlacementExperience}
          remove={deletePlacementExperience}
          template="/api/templates/experiences"
          columns="company, role, roundType, experience"
        />
      ) : null}
      {tab === "ai" ? <AiPanel ai={ai} /> : null}
    </div>
  );
}

function Editor<T extends { id: string }>({
  kind,
  rows,
  blank,
  fields,
  title,
  detail,
  save,
  remove,
  template,
  columns,
}: {
  kind: "records" | "questions" | "experiences";
  rows: T[];
  blank: Record<string, string>;
  fields: [string, string][];
  title: (row: T) => string;
  detail: (row: T) => string;
  save: (values: Record<string, string | undefined>) => Promise<{ ok: true } | { ok: false; error: string }>;
  remove: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  template: string;
  columns: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <form
        className="space-y-3 rounded-2xl border border-line bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await save({ ...values, id: editing ?? undefined });
            if (!result.ok) setError(result.error);
            else {
              setError("");
              setNote("Saved to the placement database.");
              setValues(blank);
              setEditing(null);
              router.refresh();
            }
          });
        }}
      >
        {fields.map(([name, label]) => (
          <Field key={name} label={label}>
            {name === "notes" || name === "question" || name === "experience" ? (
              <textarea className={`${fieldClass} min-h-24`} value={values[name] ?? ""} onChange={(event) => {
                const next = event.target.value;
                setValues((current) => ({ ...current, [name]: next }));
              }} />
            ) : (
              <input className={fieldClass} value={values[name] ?? ""} onChange={(event) => {
                const next = event.target.value;
                setValues((current) => ({ ...current, [name]: next }));
              }} />
            )}
          </Field>
        ))}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {note ? <p className="text-sm text-muted">{note}</p> : null}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Update" : "Add record"}</Button>
      </form>
      <div className="space-y-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">CSV import</p>
            <a className="text-sm text-copper" href={template}>Download template</a>
          </div>
          <p className="mt-1 text-xs text-muted">Columns: {columns}</p>
          <textarea className={`${fieldClass} mt-3 min-h-20`} value={csv} placeholder="Paste CSV rows" onChange={(event) => setCsv(event.target.value)} />
          <Button
            className="mt-3"
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await importPlacementCsv(kind, csv);
                if (!result.ok) setError(result.error);
                else {
                  setNote(`Imported ${result.count}. Skipped ${result.skipped}.`);
                  setCsv("");
                  setError("");
                  router.refresh();
                }
              })
            }
          >
            Import CSV
          </Button>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-line px-4 py-3">
              <p className="font-medium">{title(row)}</p>
              <p className="mt-1 text-sm text-muted">{detail(row)}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const next = { ...blank };
                    for (const key of Object.keys(blank)) next[key] = String((row as Record<string, unknown>)[key] ?? "");
                    setValues(next);
                    setEditing(row.id);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    start(async () => {
                      const result = await remove(row.id);
                      if (!result.ok) setError(result.error);
                      else router.refresh();
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {!rows.length ? <p className="text-sm text-muted">No matching rows.</p> : null}
        </div>
      </div>
    </div>
  );
}

function AiPanel({ ai }: { ai: { enabled: boolean; source: string } }) {
  const [key, setKey] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const source = ai.source === "saved" ? "A key is saved in this database." : ai.source === "environment" ? "Using OPENAI_API_KEY from the server environment." : "No key yet. The preparation engine still writes from the profile and placement records.";
  return (
    <form
      className="max-w-xl space-y-3 rounded-2xl border border-line bg-surface p-5"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveOpenAiKey(key);
          if (!result.ok) setError(result.error);
          else {
            setError("");
            setNote(key.trim() ? "Key saved. The next generation will try OpenAI." : "Saved key cleared.");
            setKey("");
          }
        });
      }}
    >
      <p className="text-sm leading-6 text-muted">{source}</p>
      <Field label="OpenAI API key">
        <input className={fieldClass} type="password" value={key} placeholder="sk-…" onChange={(event) => setKey(event.target.value)} autoComplete="off" />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {note ? <p className="text-sm text-muted">{note}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save key"}</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            start(async () => {
              const result = await saveOpenAiKey("");
              if (!result.ok) setError(result.error);
              else setNote("Saved key cleared.");
            })
          }
        >
          Clear saved key
        </Button>
      </div>
    </form>
  );
}
