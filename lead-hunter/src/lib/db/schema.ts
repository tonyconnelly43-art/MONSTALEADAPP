import { boolean, date, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Outreach, StatusChange, WebsiteAnalysis } from "../types";

export const prospects = pgTable(
  "prospects",
  {
    id: text("id").primaryKey(), // `${provider}:${sourceId}`
    provider: text("provider").notNull(),
    sourceId: text("source_id").notNull(), // e.g. Google place_id — may be stored indefinitely
    isFictional: boolean("is_fictional").notNull().default(false),

    // Provider-supplied business details. For Google, these are subject to retention limits
    // (see contentExpiresAt) and are cleared automatically once expired.
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    phone: text("phone"),
    website: text("website"),
    category: text("category"),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    sourceUrl: text("source_url"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    contentExpiresAt: timestamp("content_expires_at", { withTimezone: true }),
    contentExpired: boolean("content_expired").notNull().default(false),

    // Our own data.
    industry: text("industry").notNull(),
    chainSuspected: boolean("chain_suspected"),
    analysis: jsonb("analysis").$type<WebsiteAnalysis | null>(),
    outreach: jsonb("outreach").$type<Outreach | null>(),
    status: text("status").notNull().default("New"),
    statusHistory: jsonb("status_history").$type<StatusChange[]>().notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("prospects_provider_source_idx").on(t.provider, t.sourceId),
    index("prospects_status_idx").on(t.status),
    index("prospects_content_expires_idx").on(t.contentExpiresAt),
  ],
);

/** Billable API requests per provider per UTC day — backs the daily cap across server instances. */
export const apiUsage = pgTable(
  "api_usage",
  {
    day: date("day").notNull(),
    provider: text("provider").notNull(),
    requests: integer("requests").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.provider] })],
);

export type ProspectRow = typeof prospects.$inferSelect;
export type NewProspectRow = typeof prospects.$inferInsert;
