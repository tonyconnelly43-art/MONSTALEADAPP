import { and, eq, inArray, lte, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { prospects, type NewProspectRow, type ProspectRow } from "../db/schema";
import type { DiscoveredBusiness, Prospect, ProspectStatus } from "../types";
import { dedupe } from "../discovery/dedupe";
import { canTransition } from "../status";
import { contentExpiry } from "../prospects";

// Accept any Postgres driver Drizzle supports (postgres.js in prod, also usable in tests).
type AnyPgDb = PgDatabase<PgQueryResultHKT, any>;

export type ProspectPatch = Partial<Pick<Prospect, "notes" | "chainSuspected">>;

export interface ProspectRepo {
  list(): Promise<Prospect[]>;
  get(id: string): Promise<Prospect | null>;
  addMany(items: Prospect[]): Promise<{ added: number; duplicates: number }>;
  update(id: string, patch: ProspectPatch): Promise<Prospect | null>;
  setStatus(id: string, status: ProspectStatus, note?: string): Promise<{ ok: boolean; reason?: string; prospect?: Prospect }>;
  /** Replace provider details with freshly fetched ones (e.g. Google Place Details refresh). */
  refreshContent(id: string, b: DiscoveredBusiness, retentionDays: number): Promise<Prospect | null>;
  remove(ids: string[]): Promise<number>;
  /** Clears provider details whose retention period has passed. Returns rows cleared. */
  purgeExpiredContent(now?: Date): Promise<number>;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function rowToProspect(r: ProspectRow): Prospect {
  return {
    id: r.id,
    provider: r.provider as Prospect["provider"],
    sourceId: r.sourceId,
    isFictional: r.isFictional,
    name: r.name,
    address: r.address,
    city: r.city,
    state: r.state,
    phone: r.phone,
    website: r.website,
    category: r.category,
    rating: r.rating,
    reviewCount: r.reviewCount,
    sourceUrl: r.sourceUrl,
    retrievedAt: r.retrievedAt.toISOString(),
    contentExpiresAt: iso(r.contentExpiresAt),
    contentExpired: r.contentExpired,
    industry: r.industry,
    chainSuspected: r.chainSuspected,
    analysis: r.analysis ?? null,
    status: r.status as ProspectStatus,
    statusHistory: r.statusHistory,
    notes: r.notes,
  };
}

function prospectToRow(p: Prospect): NewProspectRow {
  return {
    id: p.id,
    provider: p.provider,
    sourceId: p.sourceId,
    isFictional: p.isFictional,
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    phone: p.phone,
    website: p.website,
    category: p.category,
    rating: p.rating,
    reviewCount: p.reviewCount,
    sourceUrl: p.sourceUrl,
    retrievedAt: new Date(p.retrievedAt),
    contentExpiresAt: p.contentExpiresAt ? new Date(p.contentExpiresAt) : null,
    contentExpired: p.contentExpired,
    industry: p.industry,
    chainSuspected: p.chainSuspected,
    analysis: p.analysis,
    status: p.status,
    statusHistory: p.statusHistory,
    notes: p.notes,
  };
}

export function createDbProspectRepo(db: AnyPgDb): ProspectRepo {
  const get = async (id: string) => {
    const [row] = await db.select().from(prospects).where(eq(prospects.id, id)).limit(1);
    return row ? rowToProspect(row) : null;
  };

  const repo: ProspectRepo = {
    async list() {
      await repo.purgeExpiredContent();
      const rows = await db.select().from(prospects).orderBy(prospects.createdAt);
      return rows.map(rowToProspect);
    },

    get,

    async addMany(items) {
      // Small pilot scale: dedupe against all existing rows in memory.
      const existing = (await db.select().from(prospects)).map(rowToProspect);
      const { unique, duplicates } = dedupe(items, existing);
      if (unique.length === 0) return { added: 0, duplicates };
      const inserted = await db
        .insert(prospects)
        .values(unique.map(prospectToRow))
        .onConflictDoNothing() // race-safe on (provider, source_id) and id
        .returning({ id: prospects.id });
      return { added: inserted.length, duplicates: duplicates + (unique.length - inserted.length) };
    },

    async update(id, patch) {
      const set: Partial<NewProspectRow> = { updatedAt: new Date() };
      if (patch.notes !== undefined) set.notes = patch.notes;
      if (patch.chainSuspected !== undefined) set.chainSuspected = patch.chainSuspected;
      const [row] = await db.update(prospects).set(set).where(eq(prospects.id, id)).returning();
      return row ? rowToProspect(row) : null;
    },

    async setStatus(id, status, note) {
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(prospects).where(eq(prospects.id, id)).for("update");
        if (!row) return { ok: false, reason: "Not found." };
        const current = rowToProspect(row);
        // Outreach gate is enforced on the server, not just in the UI.
        const check = canTransition(current, status);
        if (!check.ok) return check;
        const change = { status, at: new Date().toISOString(), ...(note ? { note } : {}) };
        const [updated] = await tx
          .update(prospects)
          .set({ status, statusHistory: [...current.statusHistory, change], updatedAt: new Date() })
          .where(eq(prospects.id, id))
          .returning();
        return { ok: true, prospect: rowToProspect(updated) };
      });
    },

    async refreshContent(id, b, retentionDays) {
      const expires = contentExpiry(b, retentionDays);
      const [row] = await db
        .update(prospects)
        .set({
          name: b.name, address: b.address, city: b.city, state: b.state, phone: b.phone, website: b.website,
          category: b.category, rating: b.rating, reviewCount: b.reviewCount, sourceUrl: b.sourceUrl,
          retrievedAt: new Date(b.retrievedAt), contentExpiresAt: expires ? new Date(expires) : null,
          contentExpired: false, updatedAt: new Date(),
        })
        .where(eq(prospects.id, id))
        .returning();
      return row ? rowToProspect(row) : null;
    },

    async remove(ids) {
      if (ids.length === 0) return 0;
      const deleted = await db.delete(prospects).where(inArray(prospects.id, ids)).returning({ id: prospects.id });
      return deleted.length;
    },

    async purgeExpiredContent(now = new Date()) {
      const cleared = await db
        .update(prospects)
        .set({
          name: "Google details expired — refresh to view",
          address: null, city: null, state: null, phone: null, website: null, category: null,
          rating: null, reviewCount: null,
          sourceUrl: sql`'https://www.google.com/maps/place/?q=place_id:' || ${prospects.sourceId}`,
          contentExpired: true,
          updatedAt: now,
        })
        .where(and(eq(prospects.contentExpired, false), lte(prospects.contentExpiresAt, now)))
        .returning({ id: prospects.id });
      return cleared.length;
    },
  };
  return repo;
}

