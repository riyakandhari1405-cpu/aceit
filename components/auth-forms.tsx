"use client";

import { useActionState } from "react";
import { login, register } from "@/lib/actions/auth";
import { Button, fieldClass, Field } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <input className={fieldClass} name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <input className={fieldClass} name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Name">
        <input className={fieldClass} name="name" autoComplete="name" required />
      </Field>
      <Field label="Email">
        <input className={fieldClass} name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <input className={fieldClass} name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password">
        <input className={fieldClass} name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>{pending ? "Creating…" : "Create profile"}</Button>
    </form>
  );
}

