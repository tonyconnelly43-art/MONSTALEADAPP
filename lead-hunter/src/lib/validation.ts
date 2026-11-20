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
  pagesFetched: z.array(str(2000)).max(5).optional(),
  pageSpeed: z
    .object({
      strategy: z.literal("mobile"),
      performance: z.number().min(0).max(100).nullable(),
      largestContentfulPaintMs: z.number().nullable(),
      cumulativeLayoutShift: z.number().nullable(),
      fetchedAt: iso,
    })
    .nullable()
    .optional(),
  pageSpeedNote: str(500).optional(),
});

export const statusSchema = z.enum(PROSPECT_STATUSES);

export const draftSchema = z.object({ subject: str(200).min(1), body: str(5000).min(1) });

const auditItemSchema = z.object({ text: str(500), findingKey: z.enum(FINDING_KEYS), evidence: str(2000).nullable() });

export const outreachSchema = z.object({
  generatedAt: iso,
  method: z.enum(["template", "ai"]),
  model: str(100).optional(),
  rubricVersion: str(40),
  score: z.number().min(0).max(100),
  isFictional: z.boolean(),
  audit: z.object({
    headline: str(300),
    opportunities: z.array(auditItemSchema).max(20),
    strengths: z.array(auditItemSchema).max(20),
    uncertainties: z.array(str(500)).max(20),
    recommendedServices: z.array(z.object({ service: str(100), why: str(500) })).max(10),
  }),
  draft: draftSchema,
  editedAt: iso.optional(),
});

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
  outreach: outreachSchema.nullable().default(null),
  status: statusSchema,
  statusHistory: z.array(z.object({ status: statusSchema, at: str(40), note: str(500).optional() })).min(1).max(200),
  notes: str(10_000),
});

export const patchSchema = z
  .object({ notes: str(10_000).optional(), chainSuspected: z.boolean().nullable().optional(), draft: draftSchema.optional() })
  .refine((v) => v.notes !== undefined || v.chainSuspected !== undefined || v.draft !== undefined, "Nothing to update");
