/**
 * Integration tests against a real Postgres. Runs only when TEST_DATABASE_URL is set, e.g.
 *   TEST_DATABASE_URL=postgres://postgres@localhost:5433/leadhunter npm test
 * The database is wiped and re-migrated — never point this at production.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../db/schema";
import { createDbProspectRepo } from "./prospectRepo";
import { createDbCounter } from "./usageCounter";
import { SAMPLE_RECORDS } from "../discovery/sampleData";
import { toProspect } from "../prospects";
import type { DiscoveredBusiness } from "../types";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Postgres repository", () => {
  const sql = postgres(url ?? "", { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  const repo = createDbProspectRepo(db);
  const samples = () => SAMPLE_RECORDS.map((r) => toProspect(r.business, r.industry, { analysis: r.analysis, chainSuspected: r.chainSuspected }));
  const google = (id: string, retrievedAt: string): DiscoveredBusiness => ({
    provider: "google_places", sourceId: id, sourceUrl: `https://maps.google.com/?cid=${id}`, isFictional: false,
    name: `Test Place ${id}`, address: "1 Test St", city: "Hudson", state: "OH", phone: `(330) 555-01${id}`,
    website: `https://${id}.example.com`, category: "Plumber", rating: 4.2, reviewCount: 12, retrievedAt,
  });

  beforeAll(async () => {
    await sql`drop schema if exists public cascade`;
    await sql`drop schema if exists drizzle cascade`;
    await sql`create schema public`;
    await migrate(db, { migrationsFolder: "./drizzle" });
  });
  beforeEach(async () => {
    await sql`truncate prospects, api_usage`;
  });
  afterAll(async () => {
    await sql.end();
  });

  it("adds with dedupe, round-trips every field, and dedupes repeat adds", async () => {
    const input = samples();
    const r = await repo.addMany(input);
    expect(r).toEqual({ added: 12, duplicates: 1 });
    const list = await repo.list();
    expect(list).toHaveLength(12);
    // Compare via JSON (jsonb storage drops undefined keys, as JSON does).
    for (const orig of input.filter((p) => p.sourceId !== "sample-13")) {
      expect(list.find((p) => p.id === orig.id)).toEqual(JSON.parse(JSON.stringify(orig)));
    }
    expect(await repo.addMany(samples())).toEqual({ added: 0, duplicates: 13 });
  });

  it("enforces the outreach gate server-side", async () => {
    await repo.addMany(samples().slice(0, 1));
    const id = samples()[0].id;
    expect((await repo.setStatus(id, "Contacted")).ok).toBe(false);
    expect((await repo.setStatus(id, "Approved for Outreach")).ok).toBe(true);
    const r = await repo.setStatus(id, "Contacted", "Called the owner");
    expect(r.ok).toBe(true);
    expect(r.prospect!.statusHistory.map((h) => h.status)).toEqual(["New", "Approved for Outreach", "Contacted"]);
    expect((await repo.setStatus("missing", "Reviewed")).reason).toBe("Not found.");
  });

  it("updates notes and chain flag", async () => {
    await repo.addMany(samples().slice(0, 1));
    const p = await repo.update(samples()[0].id, { notes: "Wrapped vans look dated", chainSuspected: true });
    expect(p).toMatchObject({ notes: "Wrapped vans look dated", chainSuspected: true });
  });

  it("clears expired Google details but keeps place ID, status, and notes; refresh restores them", async () => {
    const old = toProspect(google("41", "2026-01-01T00:00:00.000Z"), "Plumbing", undefined, 30);
    const fresh = toProspect(google("42", new Date().toISOString()), "Plumbing", undefined, 30);
    await repo.addMany([old, fresh]);
    await repo.update(old.id, { notes: "keep me" });

    const list = await repo.list(); // purges on read
    const expired = list.find((p) => p.id === old.id)!;
    expect(expired.contentExpired).toBe(true);
    expect(expired).toMatchObject({ sourceId: "41", phone: null, website: null, city: null, rating: null, notes: "keep me", status: "New" });
    expect(expired.sourceUrl).toBe("https://www.google.com/maps/place/?q=place_id:41");
    expect(list.find((p) => p.id === fresh.id)!.contentExpired).toBe(false);

    const refreshed = await repo.refreshContent(old.id, google("41", new Date().toISOString()), 30);
    expect(refreshed).toMatchObject({ contentExpired: false, phone: "(330) 555-0141", notes: "keep me" });
    expect(new Date(refreshed!.contentExpiresAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it("removes prospects", async () => {
    await repo.addMany(samples());
    expect(await repo.remove(samples().slice(0, 3).map((p) => p.id))).toBe(3);
    expect(await repo.list()).toHaveLength(9);
  });

  it("counts API usage per day across calls", async () => {
    const c = createDbCounter(db, "google_places");
    await c.add("2026-11-20", 2);
    await c.add("2026-11-20", 3);
    expect(await c.usedOn("2026-11-20")).toBe(5);
    expect(await c.usedOn("2026-11-21")).toBe(0);
  });
});
