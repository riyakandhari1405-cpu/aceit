"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action";
import { Button, fieldClass, Field } from "@/components/ui";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "url";
  placeholder?: string;
};

export function EntityList({
  title,
  description,
  addLabel,
  items,
  fields,
  blank,
  save,
  remove,
}: {
  title: string;
  description: string;
  addLabel: string;
  items: { id: string; title: string; detail: string; values: Record<string, string> }[];
  fields: FieldDef[];
  blank: Record<string, string>;
  save: (values: Record<string, string | undefined>) => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState(blank);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function beginCreate() {
    setEditing(null);
    setValues(blank);
    setOpen(true);
    setError("");
  }

  function beginEdit(item: (typeof items)[number]) {
    setEditing(item.id);
    setValues({ ...blank, ...item.values });
    setOpen(true);
    setError("");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-muted">{description}</p>
        <Button type="button" variant="secondary" onClick={beginCreate}>
          {addLabel}
        </Button>
      </div>
      {open ? (
        <form
          className="mt-4 grid gap-3 rounded-xl border border-line bg-bg p-4"
          onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await save({ ...values, id: editing ?? undefined });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOpen(false);
              setNote("Saved.");
              setError("");
              router.refresh();
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <Field label={field.label}>
                  {field.type === "textarea" ? (
                    <textarea
                      className={`${fieldClass} min-h-24`}
                      value={values[field.name] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    />
                  ) : (
                    <input
                      className={fieldClass}
                      value={values[field.name] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Update" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}
      {note && !open ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
      <div className="mt-4 space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted">Nothing here yet.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line px-4 py-3">
            <div>
              <p className="font-medium">{item.title}</p>
              {item.detail ? <p className="mt-1 text-sm text-muted">{item.detail}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => beginEdit(item)}>Edit</Button>
              {confirmId === item.id ? (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await remove(item.id);
                        if (!result.ok) setError(result.error);
                        else {
                          setConfirmId(null);
                          router.refresh();
                        }
                      })
                    }
                  >
                    Confirm
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
                </>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmId(item.id)}>Delete</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
