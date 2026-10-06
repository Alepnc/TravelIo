"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession, requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";
import { clientIp } from "@/server/security/request";
import { loginUser, registerUser, requestPasswordReset, resetPassword, updateProfile } from "@/server/services/auth";
import { toFormState } from "./handle";
import type { FormState } from "./state";

/** Solo percorsi interni: evita open redirect con ?next=https://… */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/viaggi";
}

async function limit(scope: string, max: number): Promise<FormState | null> {
  const { ok, retryAfterSec } = rateLimit(`${scope}:${await clientIp()}`, max, 15 * 60_000);
  return ok ? null : { message: `Troppi tentativi. Riprova tra ${Math.ceil(retryAfterSec / 60)} minuti.` };
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const limited = await limit("login", 10);
  if (limited) return limited;
  try {
    await loginUser({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  } catch (e) {
    return toFormState(e);
  }
  redirect(safeNext(form.get("next")));
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const limited = await limit("register", 5);
  if (limited) return limited;
  try {
    await registerUser({ name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  } catch (e) {
    return toFormState(e);
  }
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const limited = await limit("forgot", 5);
  if (limited) return limited;
  try {
    const h = await headers();
    const base = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    await requestPasswordReset({ email: String(form.get("email") ?? "") }, base);
  } catch (e) {
    return toFormState(e);
  }
  return { ok: true, message: "Se l'email è registrata, riceverai un link per reimpostare la password entro pochi minuti." };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await resetPassword({ token: String(form.get("token") ?? ""), password: String(form.get("password") ?? "") });
  } catch (e) {
    return toFormState(e);
  }
  redirect("/viaggi");
}

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/profilo");
  try {
    await updateProfile(user.id, {
      name: String(form.get("name") ?? ""),
      homeAirport: String(form.get("homeAirport") ?? ""),
      pace: String(form.get("pace") ?? "bilanciato") as "bilanciato",
      budgetLevel: String(form.get("budgetLevel") ?? "medio") as "medio",
      interests: form.getAll("interests").map(String),
    });
  } catch (e) {
    return toFormState(e);
  }
  return { ok: true, message: "Preferenze salvate" };
}
