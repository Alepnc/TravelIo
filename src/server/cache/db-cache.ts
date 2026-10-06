import "server-only";
import { eq, lt } from "drizzle-orm";
import { db, schema } from "@/server/db";

/**
 * Cache chiave/valore su database con scadenza. Pensata per risposte di provider a pagamento:
 * resiste ai riavvii e a più processi sullo stesso database.
 */
export function cacheGet<T>(key: string): { value: T; createdAt: string } | null {
  const row = db.select().from(schema.providerCache).where(eq(schema.providerCache.key, key)).get();
  if (!row) return null;
  if (row.expiresAt <= new Date().toISOString()) return null;
  try {
    return { value: JSON.parse(row.value) as T, createdAt: row.createdAt };
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  const now = new Date();
  const row = { key, value: JSON.stringify(value), expiresAt: new Date(now.getTime() + ttlMs).toISOString(), createdAt: now.toISOString() };
  db.insert(schema.providerCache).values(row).onConflictDoUpdate({ target: schema.providerCache.key, set: { value: row.value, expiresAt: row.expiresAt, createdAt: row.createdAt } }).run();
  // Pulizia occasionale delle voci scadute
  if (Math.random() < 0.02) db.delete(schema.providerCache).where(lt(schema.providerCache.expiresAt, now.toISOString())).run();
}
