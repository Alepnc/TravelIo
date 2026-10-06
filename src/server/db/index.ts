import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/travelio.db";
  return path.resolve(process.cwd(), url.replace(/^file:/, ""));
}

function createDb() {
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  // Le migrazioni versionate vivono in /drizzle e vengono applicate all'avvio.
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}

type DB = ReturnType<typeof createDb>;

// In dev l'HMR ricarica i moduli: riusiamo la connessione.
const globalForDb = globalThis as unknown as { __travelioDb?: DB };
export const db: DB = globalForDb.__travelioDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__travelioDb = db;

export { schema };
