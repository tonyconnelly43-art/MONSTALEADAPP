import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

let db: Db | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Lazily-created singleton. Use the pooled connection string from Neon on Vercel. */
export function getDb(): Db {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  if (!db) {
    const sql = postgres(process.env.DATABASE_URL, {
      max: 5,
      prepare: false, // required for transaction-mode poolers (Neon pooled URLs)
      idle_timeout: 20,
    });
    db = drizzle(sql, { schema });
  }
  return db;
}
