import type { DiscoveredBusiness, Prospect, WebsiteAnalysis } from "./types";

export function newProspectId(b: Pick<DiscoveredBusiness, "provider" | "sourceId">): string {
  return `${b.provider}:${b.sourceId}`;
}

/**
 * Days we keep Google-supplied details before clearing them. Google's Maps Platform terms allow
 * storing place IDs indefinitely but restrict caching other Places content — confirm the current
 * terms and set GOOGLE_CONTENT_RETENTION_DAYS accordingly.
 */
export const DEFAULT_GOOGLE_RETENTION_DAYS = 30;

export function contentExpiry(b: Pick<DiscoveredBusiness, "provider" | "retrievedAt">, retentionDays: number): string | null {
  if (b.provider !== "google_places") return null;
  return new Date(new Date(b.retrievedAt).getTime() + retentionDays * 86_400_000).toISOString();
}

export function toProspect(
  b: DiscoveredBusiness,
  industry: string,
  enrichment?: { analysis: WebsiteAnalysis | null; chainSuspected: boolean | null },
  retentionDays = DEFAULT_GOOGLE_RETENTION_DAYS,
): Prospect {
  const now = new Date().toISOString();
  return {
    ...b,
    id: newProspectId(b),
    industry,
    chainSuspected: enrichment?.chainSuspected ?? null,
    analysis: enrichment?.analysis ?? null,
    contentExpiresAt: contentExpiry(b, retentionDays),
    contentExpired: false,
    status: "New",
    statusHistory: [{ status: "New", at: now, note: `Discovered via ${b.provider}` }],
    notes: "",
  };
}

/** Public Google Maps link built from a place ID (allowed to be stored indefinitely). */
export function placeIdMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}
