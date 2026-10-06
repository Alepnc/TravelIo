import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { ProviderError } from "../errors";

export type UsageClass = "interactive" | "indicative";

/**
 * Le ricerche "indicative" (prezzi nelle pagine di scoperta) possono consumare al massimo questa quota
 * del mese: il resto è riservato alle ricerche esplicite degli utenti.
 */
export const INDICATIVE_SHARE = 0.7;

function period(provider: string, now = new Date()) {
  return `${provider}:${now.toISOString().slice(0, 7)}`;
}

export function monthlyLimit(): number {
  const n = Number(process.env.SERPAPI_MONTHLY_LIMIT ?? 250);
  return Number.isFinite(n) && n > 0 ? n : 250;
}

export function usageThisMonth(provider = "serpapi"): { used: number; limit: number } {
  const row = db.select().from(schema.providerUsage).where(eq(schema.providerUsage.period, period(provider))).get();
  return { used: row?.count ?? 0, limit: monthlyLimit() };
}

/**
 * Prenota una ricerca sul contatore mensile PRIMA di inviarla (conservativo: meglio contare una ricerca
 * in più che sforare il piano). Lancia ProviderError se il tetto è raggiunto.
 */
export function reserveSearch(klass: UsageClass, provider = "serpapi"): { used: number; limit: number } {
  const limit = monthlyLimit();
  const key = period(provider);
  const cap = klass === "indicative" ? Math.floor(limit * INDICATIVE_SHARE) : limit;
  const current = db.select().from(schema.providerUsage).where(eq(schema.providerUsage.period, key)).get()?.count ?? 0;
  if (current >= cap) {
    throw new ProviderError(
      "unavailable",
      klass === "indicative"
        ? "I prezzi indicativi sono in pausa per questo mese per lasciare quota alle ricerche dirette. Cerca un viaggio per vedere i prezzi."
        : "Abbiamo raggiunto il limite mensile di ricerche sui prezzi reali. Riprova il mese prossimo o aumenta il piano.",
    );
  }
  const row = db
    .insert(schema.providerUsage)
    .values({ period: key, count: 1 })
    .onConflictDoUpdate({ target: schema.providerUsage.period, set: { count: sql`${schema.providerUsage.count} + 1` } })
    .returning()
    .get();
  return { used: row.count, limit };
}
