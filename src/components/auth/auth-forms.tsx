"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeSlash as EyeOff } from "@phosphor-icons/react/dist/ssr";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-md bg-ink px-3.5 py-2.5 text-sm font-medium text-board-text" : "rounded-md bg-danger px-3.5 py-2.5 text-sm font-medium text-white"}>
      {state.message}
    </p>
  );
}

function PasswordInput({ name, autoComplete, invalid }: { name: string; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={name} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={autoComplete === "new-password" ? 8 : 1} aria-invalid={invalid} className="pr-11" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted hoverable:hover:bg-ink/5" aria-label={show ? "Nascondi password" : "Mostra password"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.errors?.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.errors?.password}>
        <PasswordInput name="password" autoComplete="current-password" invalid={!!state.errors?.password} />
      </Field>
      <div className="text-right">
        <Link href="/password-dimenticata" className="text-sm font-semibold text-ink underline underline-offset-4">
          Password dimenticata?
        </Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Accedi
      </Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="Come ti chiami?" htmlFor="name" error={state.errors?.name}>
        <Input id="name" name="name" autoComplete="given-name" required aria-invalid={!!state.errors?.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.errors?.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.errors?.password} hint="Almeno 8 caratteri">
        <PasswordInput name="password" autoComplete="new-password" invalid={!!state.errors?.password} />
      </Field>
      <Button type="submit" className="w-full" size="lg" variant="secondary" loading={pending}>
        Crea account
      </Button>
      <p className="text-xs text-muted">Creando un account accetti di salvare i tuoi viaggi su TravelIo. Niente spam, promesso.</p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email dell'account" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.errors?.email} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Inviami il link
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      {state.errors?.token && <p className="text-sm text-danger">Link non valido. Richiedine uno nuovo.</p>}
      <Field label="Nuova password" htmlFor="password" error={state.errors?.password} hint="Almeno 8 caratteri">
        <PasswordInput name="password" autoComplete="new-password" invalid={!!state.errors?.password} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Salva nuova password
      </Button>
    </form>
  );
}
