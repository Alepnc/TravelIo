import "server-only";
import { eq, lt } from "drizzle-orm";
import { db, schema } from "@/server/db";

/**
 * Cache chiave/valore su database con scadenza. Pensata per risposte di provider a pagamento:
 * resiste ai riavvii e a più processi sullo stesso database.
 */
export async function cacheGet<T>(key: string): Promise<{ value: T; createdAt: string } | null> {
  const [row] = await db.select().from(schema.providerCache).where(eq(schema.providerCache.key, key)).limit(1);
  if (!row) return null;
  if (row.expiresAt <= new Date().toISOString()) return null;
  try {
    return { value: JSON.parse(row.value) as T, createdAt: row.createdAt };
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  const now = new Date();
  const row = { key, value: JSON.stringify(value), expiresAt: new Date(now.getTime() + ttlMs).toISOString(), createdAt: now.toISOString() };
  await db.insert(schema.providerCache).values(row).onConflictDoUpdate({ target: schema.providerCache.key, set: { value: row.value, expiresAt: row.expiresAt, createdAt: row.createdAt } });
  // Pulizia occasionale delle voci scadute
  if (Math.random() < 0.02) await db.delete(schema.providerCache).where(lt(schema.providerCache.expiresAt, now.toISOString()));
}
