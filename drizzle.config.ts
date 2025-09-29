// BERAT ÇAKIROĞLU
// BERAT CAKIROGLU OZEL ANALIZ SISTEMI
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
// BERAT ÇAKIROĞLU
// BERAT CAKIROGLU OZEL ANALIZ SISTEMI
