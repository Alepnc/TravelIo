/**
 * Applica le migrazioni di /drizzle al database Postgres di DATABASE_URL (eseguito da "npm run build",
 * quindi anche a ogni deploy su Vercel). Con PGlite in locale non fa nulla: le migrazioni partono all'avvio dell'app.
 */
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
// In locale le migrazioni le applica `npm run dev`; in build si migra solo un database esterno (es. su Vercel)
if (!url || !/^postgres(ql)?:\/\//.test(url) || url.includes("127.0.0.1:5433")) {
  console.log("[migrate] nessun database esterno in DATABASE_URL: salto (in locale ci pensa `npm run dev`).");
  process.exit(0);
}

// Per le migrazioni conviene la connessione diretta (non quella "pooled"), se disponibile
const client = postgres(process.env.DATABASE_URL_UNPOOLED ?? url, { max: 1, prepare: false, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  console.log("[migrate] database aggiornato");
} finally {
  await client.end();
}
