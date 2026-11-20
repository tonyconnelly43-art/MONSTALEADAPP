import { z } from "zod";
import { FINDING_KEYS, PROSPECT_STATUSES } from "./types";

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");
const str = (max = 500) => z.string().max(max);

const findingSchema = z.object({
  key: z.enum(FINDING_KEYS),
  dimension: z.enum(["website_quality", "positioning", "visual_identity", "brand_consistency"]),
  result: z.enum(["pass", "fail", "unknown"]),
  evidence: str(2000).nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  note: str(1000).optional(),
});

const analysisSchema = z.object({
  analyzedAt: iso,
  url: str(2000),
  fetched: z.boolean(),
  fetchNote: str(1000).optional(),
  findings: z.array(findingSchema).max(50),
});

export const statusSchema = z.enum(PROSPECT_STATUSES);

/** Shape check for prospects imported from browser storage into the database. */
export const prospectSchema = z.object({
  id: str(300),
  provider: z.enum(["sample", "google_places"]),
  sourceId: str(300),
  sourceUrl: str(2000).nullable(),
  isFictional: z.boolean(),
  name: str(300).min(1),
  address: str().nullable(),
  city: str(120).nullable(),
  state: str(20).nullable(),
  phone: str(40).nullable(),
  website: str(2000).nullable(),
  category: str(200).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().min(0).nullable(),
  retrievedAt: iso,
  industry: str(100).min(1),
  chainSuspected: z.boolean().nullable(),
  analysis: analysisSchema.nullable(),
  // Older browser data predates these fields.
  contentExpiresAt: iso.nullable().default(null),
  contentExpired: z.boolean().default(false),
  status: statusSchema,
  statusHistory: z.array(z.object({ status: statusSchema, at: str(40), note: str(500).optional() })).min(1).max(200),
  notes: str(10_000),
});

export const patchSchema = z
  .object({ notes: str(10_000).optional(), chainSuspected: z.boolean().nullable().optional() })
  .refine((v) => v.notes !== undefined || v.chainSuspected !== undefined, "Nothing to update");
