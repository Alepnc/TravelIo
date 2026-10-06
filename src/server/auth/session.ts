import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";

export const SESSION_COOKIE = "travelio_session";
const SESSION_DAYS = 30;

export type SessionUser = { id: string; email: string; name: string; homeAirport: string | null };

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt: expiresAt.toISOString() }).run();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token))).run();
  jar.delete(SESSION_COOKIE);
}

/** Utente corrente (memoizzato per richiesta). null se non autenticato o sessione scaduta. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      homeAirport: schema.users.homeAirport,
      expiresAt: schema.sessions.expiresAt,
      sessionId: schema.sessions.id,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, sha256(token)))
    .get();
  if (!row) return null;
  if (new Date(row.expiresAt) < new Date()) {
    db.delete(schema.sessions).where(eq(schema.sessions.id, row.sessionId)).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, homeAirport: row.homeAirport };
});

/** Per pagine e server action: reindirizza al login conservando la destinazione. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/accedi${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}
