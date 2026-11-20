import { z } from "zod";
import { PILOT_MAX_RESULTS } from "./provider";

export const ALL_INDUSTRIES = "All target industries";

export const searchQuerySchema = z.object({
  city: z.string().trim().min(1, "City is required").max(80),
  state: z
    .string()
    .trim()
    .length(2, "Use a 2-letter state code")
    .transform((s) => s.toUpperCase()),
  radiusMiles: z.coerce.number().int().min(1).max(50),
  industry: z.string().trim().min(2, "Industry is required").max(60),
  limit: z.coerce.number().int().min(1).max(PILOT_MAX_RESULTS),
});

export const discoverRequestSchema = z.object({
  provider: z.enum(["sample", "google_places"]),
  query: searchQuerySchema,
  /** Explicit user confirmation required before any billable provider runs. */
  confirmBillable: z.boolean().default(false),
});

export const DEFAULT_QUERY = {
  city: "Macedonia",
  state: "OH",
  radiusMiles: 15,
  industry: ALL_INDUSTRIES,
  limit: PILOT_MAX_RESULTS,
};
