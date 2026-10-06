/**
 * Crea .env.local partendo da .env.example, senza sovrascrivere un file già esistente.
 * Funziona su macOS, Windows e Linux (nessun comando di shell).
 *
 *   npm run setup:env
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.cwd();
const example = path.join(dir, ".env.example");
const target = path.join(dir, ".env.local");

if (!fs.existsSync(example)) {
  console.error("Non trovo .env.example in questa cartella: esegui il comando dalla radice del progetto (dove c'è package.json).");
  process.exit(1);
}
if (fs.existsSync(target)) {
  console.log(`.env.local esiste già (${target}): non lo tocco.`);
} else {
  fs.copyFileSync(example, target);
  console.log(`Creato ${target}`);
}
console.log("\nOra apri .env.local con un editor di testo e scrivi la chiave dopo SERPAPI_API_KEY=\n(il file inizia con un punto, quindi è nascosto in Finder/Esplora risorse: usa l'editor o 'ls -a').");
