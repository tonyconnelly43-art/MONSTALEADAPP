import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { apiUsage } from "../db/schema";
import type { RequestCounter } from "../discovery/usageGuard";
import { and, eq } from "drizzle-orm";

type AnyPgDb = PgDatabase<PgQueryResultHKT, any>;

/** Daily billable-request counter shared by every server instance. */
export function createDbCounter(db: AnyPgDb, provider: string): RequestCounter {
  return {
    async usedOn(day) {
      const [row] = await db
        .select({ requests: apiUsage.requests })
        .from(apiUsage)
        .where(and(eq(apiUsage.day, day), eq(apiUsage.provider, provider)));
      return row?.requests ?? 0;
    },
    async add(day, n) {
      await db
        .insert(apiUsage)
        .values({ day, provider, requests: n })
        .onConflictDoUpdate({ target: [apiUsage.day, apiUsage.provider], set: { requests: sql`${apiUsage.requests} + ${n}` } });
    },
  };
}
