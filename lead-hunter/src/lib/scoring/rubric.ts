import type { FindingKey, Prospect } from "../types";
import { FINDING_META } from "../findings";

/**
 * Transparent opportunity scoring rubric.
 *
 * Total = Brand Opportunity (max 60) + Business Fit (max 40) = 100.
 *
 *  - Brand Opportunity awards points for each *observed* weakness (a failed check).
 *    A passed check earns 0 (no opportunity there). An unknown check earns 0 and
 *    lowers "data completeness" — we never assume a weakness we did not observe.
 *  - Business Fit awards points for signals that the business is a good client.
 *
 * Bump RUBRIC_VERSION whenever weights or rules change so stored scores stay explainable.
 */
export const RUBRIC_VERSION = "2026.11-v1";

export const QUALIFY_THRESHOLD = 55;
export const MIN_COMPLETENESS = 0.6;

/** Points awarded when the check FAILS (i.e., brand improvement opportunity observed). */
export const OPPORTUNITY_WEIGHTS: Record<FindingKey, number> = {
  // Website quality — 20
  https: 4,
  mobile_viewport: 6,
  meta_description: 2,
  click_to_call: 4,
  copyright_current: 4,
  // Positioning — 15
  clear_headline: 5,
  primary_cta: 6,
  service_area_stated: 4,
  // Visual identity — 13
  logo_present: 8,
  favicon_present: 5,
  // Brand consistency — 12
  name_consistent: 4,
  social_links: 3,
  local_business_schema: 2,
  phone_matches_listing: 3,
};

export const OPPORTUNITY_MAX = Object.values(OPPORTUNITY_WEIGHTS).reduce((a, b) => a + b, 0);
/** Points awarded when the business has no website at all (website design opportunity). */
export const NO_WEBSITE_POINTS = 20;

/** Keywords used to confirm a provider category matches the searched industry. */
export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  HVAC: ["hvac", "heating", "air conditioning", "furnace", "cooling"],
  Plumbing: ["plumb", "drain", "sewer", "water heater"],
  "Garage Doors": ["garage door", "garage"],
  Electrical: ["electric"],
  Roofing: ["roof"],
  Landscaping: ["landscap", "lawn", "hardscap", "tree service"],
};

export interface ScoreComponent {
  id: string;
  group: "opportunity" | "fit";
  label: string;
  points: number;
  max: number;
  /** Plain-English reason shown in the UI. */
  reason: string;
  /** True when the input needed for this component was not available. */
  unknown: boolean;
}

export interface ScoreResult {
  version: string;
  total: number;
  opportunity: number;
  fit: number;
  /** Share (0–1) of the 100 possible points whose inputs were actually determinable. */
  completeness: number;
  qualified: boolean;
  qualifyReason: string;
  components: ScoreComponent[];
}

function fitComponents(p: Prospect): ScoreComponent[] {
  const out: ScoreComponent[] = [];

  // Industry match (10)
  const kws = INDUSTRY_KEYWORDS[p.industry] ?? [p.industry.toLowerCase()];
  if (!p.category) {
    out.push({ id: "fit_industry", group: "fit", label: "Target industry", points: 0, max: 10, unknown: true, reason: "Provider did not supply a category." });
  } else {
    const cat = p.category.toLowerCase();
    const match = kws.some((k) => cat.includes(k));
    out.push({
      id: "fit_industry", group: "fit", label: "Target industry", points: match ? 10 : 0, max: 10, unknown: false,
      reason: match ? `Category "${p.category}" matches ${p.industry}.` : `Category "${p.category}" does not clearly match ${p.industry}.`,
    });
  }

  // Local market (10)
  const hasLoc = Boolean(p.city && p.state);
  out.push({
    id: "fit_market", group: "fit", label: "In target market", points: hasLoc ? 10 : 0, max: 10, unknown: !hasLoc,
    reason: hasLoc ? `Located in ${p.city}, ${p.state} (returned by a location-bounded search).` : "City/state not available.",
  });

  // Reachable (5)
  const reachable = Boolean(p.phone || p.website);
  out.push({
    id: "fit_reachable", group: "fit", label: "Reachable", points: reachable ? 5 : 0, max: 5, unknown: false,
    reason: reachable ? "Has a public phone number or website." : "No public phone or website found.",
  });

  // Established (10) — review count as a proxy for an operating, revenue-generating business.
  if (p.reviewCount == null) {
    out.push({ id: "fit_established", group: "fit", label: "Established business", points: 0, max: 10, unknown: true, reason: "Review count not available." });
  } else {
    const n = p.reviewCount;
    const pts = n >= 25 ? 10 : n >= 10 ? 7 : n >= 1 ? 4 : 1;
    out.push({ id: "fit_established", group: "fit", label: "Established business", points: pts, max: 10, unknown: false, reason: `${n} public reviews (≥25 = 10, 10–24 = 7, 1–9 = 4, 0 = 1).` });
  }

  // Independent (5) — national chains rarely buy local branding.
  if (p.chainSuspected == null) {
    out.push({ id: "fit_independent", group: "fit", label: "Independent / local owner", points: 0, max: 5, unknown: true, reason: "Not yet assessed (mark in review)." });
  } else {
    out.push({
      id: "fit_independent", group: "fit", label: "Independent / local owner", points: p.chainSuspected ? 0 : 5, max: 5, unknown: false,
      reason: p.chainSuspected ? "Appears to be a chain/franchise location." : "Appears independently owned.",
    });
  }
  return out;
}

function opportunityComponents(p: Prospect): ScoreComponent[] {
  if (!p.website) {
    // No website: a clear website-design opportunity, but brand checks are not observable.
    return [
      { id: "opp_no_website", group: "opportunity", label: "No website found", points: NO_WEBSITE_POINTS, max: NO_WEBSITE_POINTS, unknown: false, reason: "Provider listing has no website — website design opportunity." },
      { id: "opp_unobservable", group: "opportunity", label: "On-site brand checks", points: 0, max: OPPORTUNITY_MAX - NO_WEBSITE_POINTS, unknown: true, reason: "No website to analyze; review vehicles, signage, and social profiles manually." },
    ];
  }
  if (!p.analysis) {
    return [
      { id: "opp_pending", group: "opportunity", label: "Website analysis", points: 0, max: OPPORTUNITY_MAX, unknown: true, reason: "Website not analyzed yet." },
    ];
  }
  const byKey = new Map(p.analysis.findings.map((f) => [f.key, f]));
  return (Object.keys(OPPORTUNITY_WEIGHTS) as FindingKey[]).map((key) => {
    const max = OPPORTUNITY_WEIGHTS[key];
    const f = byKey.get(key);
    const meta = FINDING_META[key];
    if (!f || f.result === "unknown") {
      return { id: `opp_${key}`, group: "opportunity" as const, label: meta.label, points: 0, max, unknown: true, reason: f?.note ?? "Could not be determined." };
    }
    const failed = f.result === "fail";
    return {
      id: `opp_${key}`, group: "opportunity" as const, label: meta.label, points: failed ? max : 0, max, unknown: false,
      reason: failed ? `Weakness observed: ${f.evidence ?? "see evidence"}` : "Already in good shape — no opportunity here.",
    };
  });
}

export function scoreProspect(p: Prospect): ScoreResult {
  const components = [...opportunityComponents(p), ...fitComponents(p)];
  const sum = (g: ScoreComponent["group"]) => components.filter((c) => c.group === g).reduce((a, c) => a + c.points, 0);
  const opportunity = sum("opportunity");
  const fit = sum("fit");
  const total = opportunity + fit;
  const knownMax = components.filter((c) => !c.unknown).reduce((a, c) => a + c.max, 0);
  const completeness = knownMax / 100;

  let qualified = false;
  let qualifyReason: string;
  if (completeness < MIN_COMPLETENESS) {
    qualifyReason = `Needs more data (${Math.round(completeness * 100)}% of the rubric could be evaluated; ${MIN_COMPLETENESS * 100}% required).`;
  } else if (total < QUALIFY_THRESHOLD) {
    qualifyReason = `Score ${total} is below the ${QUALIFY_THRESHOLD}-point threshold.`;
  } else {
    qualified = true;
    qualifyReason = `Score ${total} ≥ ${QUALIFY_THRESHOLD} with ${Math.round(completeness * 100)}% data completeness.`;
  }

  return { version: RUBRIC_VERSION, total, opportunity, fit, completeness, qualified, qualifyReason, components };
}
