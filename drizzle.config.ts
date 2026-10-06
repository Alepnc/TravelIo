import { defineConfig } from "drizzle-kit";

// Solo "generate" (scrive le migrazioni SQL in /drizzle): non serve un database collegato.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
