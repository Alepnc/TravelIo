import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Un solo dialetto (PostgreSQL) e un solo driver per l'app:
 * - produzione (Vercel): DATABASE_URL di Neon o di qualsiasi Postgres; le migrazioni girano in build (scripts/migrate.mts);
 * - sviluppo: `npm run dev` avvia PGlite (Postgres in data/pglite, nessuna installazione) come server locale
 *   sulla porta 5433 e l'app ci si collega come a un Postgres vero (vedi scripts/dev.mts);
 * - test: "memory://" usa PGlite nello stesso processo, in memoria.
 */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

export const LOCAL_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5433/postgres";

async function createDb(): Promise<DB> {
  const url = process.env.DATABASE_URL || LOCAL_DATABASE_URL;
  if (url === "memory://") {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const db = drizzle(new PGlite(), { schema });
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    return db as unknown as DB;
  }
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // prepare:false per compatibilità con i pooler (Neon pooled/PgBouncer); poche connessioni per istanza serverless
  // Con il database locale di sviluppo (PGlite) una connessione per processo: PGlite esegue una query alla volta
  const local = url === LOCAL_DATABASE_URL;
  const client = postgres(url, { prepare: false, max: local ? 1 : 3, idle_timeout: 20 });
  return drizzle(client, { schema }) as unknown as DB;
}

// In dev l'HMR ricarica i moduli: riusiamo la connessione.
const globalForDb = globalThis as unknown as { __travelioDb?: Promise<DB> };
const dbPromise = globalForDb.__travelioDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__travelioDb = dbPromise;

export const db: DB = await dbPromise;

export { schema };
