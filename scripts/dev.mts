/**
 * `npm run dev`: avvia il database locale e poi `next dev`.
 * Il database è PGlite (PostgreSQL compilato in WebAssembly) salvato in data/pglite ed esposto come server
 * Postgres sulla porta 5433: Next usa più processi in sviluppo, e così tutti parlano con un solo database.
 * Se DATABASE_URL punta già a un altro Postgres (es. un branch Neon di sviluppo) il server locale non parte.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const LOCAL = "postgres://postgres:postgres@127.0.0.1:5433/postgres";
const external = process.env.DATABASE_URL && process.env.DATABASE_URL !== LOCAL;

let server: PGLiteSocketServer | null = null;
if (!external) {
  const dir = path.resolve(process.cwd(), "data/pglite");
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const pg = new PGlite(dir);
  await migrate(drizzle(pg), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  server = new PGLiteSocketServer({ db: pg, port: 5433, host: "127.0.0.1", maxConnections: 32 });
  await server.start();
  console.log("◆ Database locale (PGlite) su 127.0.0.1:5433, dati in data/pglite");
}

const next = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: external ? process.env.DATABASE_URL : LOCAL },
});
const stop = async () => {
  next.kill("SIGTERM");
  await server?.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", async (code) => {
  await server?.stop();
  process.exit(code ?? 0);
});
