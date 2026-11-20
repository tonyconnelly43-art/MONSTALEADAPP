// Applies SQL migrations in ./drizzle. Skips quietly when DATABASE_URL is not set,
// so builds without a database (browser-storage mode) still succeed.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.log("[migrate] DATABASE_URL not set — skipping (browser-storage mode).");
  process.exit(0);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database is up to date.");
} finally {
  await sql.end();
}
