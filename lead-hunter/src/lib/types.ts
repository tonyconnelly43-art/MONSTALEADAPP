/**
 * Core domain types for MONSTA Lead Hunter.
 *
 * Design rules:
 *  - Every prospect records where it came from (provider + source URL) and whether it is fictional.
 *  - Every website finding records evidence and confidence. "unknown" is a first-class result:
 *    we never guess a pass/fail we could not observe.
 */

export const PROSPECT_STATUSES = [
  "New",
  "Reviewed",
  "Approved for Outreach",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Closed",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PRESET_INDUSTRIES = [
  "HVAC",
  "Plumbing",
  "Garage Doors",
  "Electrical",
  "Roofing",
  "Landscaping",
] as const;

export type ProviderId = "sample" | "google_places";

export interface SearchQuery {
  city: string;
  state: string; // 2-letter US state code
  radiusMiles: number;
  industry: string; // preset or custom
  limit: number; // pilot cap: 25
}

/** Raw record returned by a discovery provider, before scoring/analysis. */
export interface DiscoveredBusiness {
  provider: ProviderId;
  /** Stable ID from the provider (e.g. Google place_id). Used for dedupe. */
  sourceId: string;
  /** Link back to the public listing, when the provider supplies one. */
  sourceUrl: string | null;
  isFictional: boolean;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  /** Provider's category label(s), e.g. "HVAC contractor". */
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  retrievedAt: string; // ISO timestamp
}

export type FindingDimension =
  | "website_quality"
  | "positioning"
  | "visual_identity"
  | "brand_consistency";

export type FindingResult = "pass" | "fail" | "unknown";
export type Confidence = "high" | "medium" | "low";

export interface Finding {
  /** Stable key referenced by the scoring rubric. */
  key: FindingKey;
  dimension: FindingDimension;
  result: FindingResult;
  /** What we actually observed (snippet, selector, header). Required unless result is "unknown". */
  evidence: string | null;
  confidence: Confidence;
  /** Why the result is unknown or low-confidence. */
  note?: string;
}

export const FINDING_KEYS = [
  "https",
  "mobile_viewport",
  "meta_description",
  "click_to_call",
  "copyright_current",
  "clear_headline",
  "primary_cta",
  "service_area_stated",
  "logo_present",
  "favicon_present",
  "name_consistent",
  "social_links",
  "local_business_schema",
  "phone_matches_listing",
] as const;
export type FindingKey = (typeof FINDING_KEYS)[number];

export interface PageSpeedResult {
  strategy: "mobile";
  /** Lighthouse performance score 0–100. */
  performance: number | null;
  largestContentfulPaintMs: number | null;
  cumulativeLayoutShift: number | null;
  fetchedAt: string;
}

export interface WebsiteAnalysis {
  analyzedAt: string;
  url: string;
  /** False when the site could not be fetched; all findings will then be "unknown". */
  fetched: boolean;
  fetchNote?: string;
  findings: Finding[];
  /** Pages actually read (at most two). */
  pagesFetched?: string[];
  /** Google PageSpeed Insights (mobile). Informational; not part of rubric v1. */
  pageSpeed?: PageSpeedResult | null;
  pageSpeedNote?: string;
}

/** One audit point, always tied to a recorded finding (its evidence is copied from that finding). */
export interface AuditItem {
  text: string;
  findingKey: FindingKey;
  evidence: string | null;
}

export interface MiniAudit {
  headline: string;
  opportunities: AuditItem[];
  strengths: AuditItem[];
  /** What couldn't be determined, stated plainly (e.g. vehicle wraps aren't visible on a website). */
  uncertainties: string[];
  recommendedServices: { service: string; why: string }[];
}

export interface OutreachDraft {
  subject: string;
  body: string;
}

export interface Outreach {
  generatedAt: string;
  method: "template" | "ai";
  model?: string;
  rubricVersion: string;
  score: number;
  isFictional: boolean;
  audit: MiniAudit;
  draft: OutreachDraft;
  /** Set when a person edited the draft. */
  editedAt?: string;
}

export interface StatusChange {
  status: ProspectStatus;
  at: string;
  note?: string;
}

export interface Prospect extends DiscoveredBusiness {
  id: string;
  /** Industry the prospect was searched under (used for fit scoring). */
  industry: string;
  /** Whether the business is suspected to be a large chain/franchise. null = not assessed. */
  chainSuspected: boolean | null;
  analysis: WebsiteAnalysis | null;
  /**
   * When provider-supplied details must be deleted under the provider's terms (Google Places).
   * null = no limit (sample data, or our own data).
   */
  contentExpiresAt: string | null;
  /** True once provider details were cleared; only the source ID and our own data remain. */
  contentExpired: boolean;
  /** Mini brand audit + outreach draft. Never sent by the app. */
  outreach: Outreach | null;
  status: ProspectStatus;
  statusHistory: StatusChange[];
  notes: string;
}
