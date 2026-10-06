import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema } from "@/lib/validation";
import { db, schema } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, sha256 } from "@/server/auth/session";
import { mailer } from "@/server/providers/mail";
import { AppError } from "./errors";

// Hash fittizio per uniformare i tempi di risposta quando l'email non esiste
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function registerUser(raw: z.input<typeof registerSchema>) {
  const input = registerSchema.parse(raw);
  const exists = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email)).get();
  if (exists) throw new AppError("conflict", "Esiste già un account con questa email");
  const user = db
    .insert(schema.users)
    .values({ email: input.email, name: input.name, passwordHash: await hashPassword(input.password) })
    .returning({ id: schema.users.id })
    .get();
  db.insert(schema.preferences).values({ userId: user.id }).run();
  await createSession(user.id);
  return user.id;
}

export async function loginUser(raw: z.input<typeof loginSchema>) {
  const input = loginSchema.parse(raw);
  const user = db.select().from(schema.users).where(eq(schema.users.email, input.email)).get();
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError("validation", "Email o password non corretti");
  await createSession(user.id);
  return user.id;
}

/** Risponde sempre allo stesso modo, per non rivelare quali email sono registrate. */
export async function requestPasswordReset(raw: z.input<typeof forgotSchema>, baseUrl: string) {
  const input = forgotSchema.parse(raw);
  const user = db.select().from(schema.users).where(eq(schema.users.email, input.email)).get();
  if (!user) return;
  const token = randomBytes(32).toString("base64url");
  db.insert(schema.passwordResetTokens)
    .values({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() })
    .run();
  await mailer.send({
    to: user.email,
    subject: "Reimposta la tua password TravelIo",
    text: `Ciao ${user.name},\napri questo link entro 30 minuti per scegliere una nuova password:\n${baseUrl}/reset-password?token=${token}\n\nSe non hai chiesto tu il reset, ignora questa email.`,
  });
}

export async function resetPassword(raw: z.input<typeof resetSchema>) {
  const input = resetSchema.parse(raw);
  const now = new Date().toISOString();
  const row = db
    .select()
    .from(schema.passwordResetTokens)
    .where(and(eq(schema.passwordResetTokens.tokenHash, sha256(input.token)), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, now)))
    .get();
  if (!row) throw new AppError("validation", "Il link non è valido o è scaduto. Richiedine uno nuovo.");
  const passwordHash = await hashPassword(input.password);
  db.transaction((tx) => {
    tx.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, row.userId)).run();
    tx.update(schema.passwordResetTokens).set({ usedAt: now }).where(eq(schema.passwordResetTokens.id, row.id)).run();
    // Invalida tutte le sessioni esistenti
    tx.delete(schema.sessions).where(eq(schema.sessions.userId, row.userId)).run();
  });
  await createSession(row.userId);
}

export function getProfile(userId: string) {
  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) throw new AppError("not_found", "Utente non trovato");
  const prefs = db.select().from(schema.preferences).where(eq(schema.preferences.userId, userId)).get();
  return {
    name: user.name,
    email: user.email,
    homeAirport: user.homeAirport ?? "",
    pace: prefs?.pace ?? "bilanciato",
    budgetLevel: prefs?.budgetLevel ?? "medio",
    interests: prefs?.interests ?? [],
  };
}

export function updateProfile(userId: string, raw: z.input<typeof profileSchema>) {
  const input = profileSchema.parse(raw);
  db.transaction((tx) => {
    tx.update(schema.users).set({ name: input.name, homeAirport: input.homeAirport || null }).where(eq(schema.users.id, userId)).run();
    tx.insert(schema.preferences)
      .values({ userId, pace: input.pace, budgetLevel: input.budgetLevel, interests: input.interests })
      .onConflictDoUpdate({ target: schema.preferences.userId, set: { pace: input.pace, budgetLevel: input.budgetLevel, interests: input.interests } })
      .run();
  });
}
