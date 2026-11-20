import type { DiscoveredBusiness, Prospect, WebsiteAnalysis } from "./types";

export function newProspectId(b: DiscoveredBusiness): string {
  return `${b.provider}:${b.sourceId}`;
}

export function toProspect(
  b: DiscoveredBusiness,
  industry: string,
  enrichment?: { analysis: WebsiteAnalysis | null; chainSuspected: boolean | null },
): Prospect {
  const now = new Date().toISOString();
  return {
    ...b,
    id: newProspectId(b),
    industry,
    chainSuspected: enrichment?.chainSuspected ?? null,
    analysis: enrichment?.analysis ?? null,
    status: "New",
    statusHistory: [{ status: "New", at: now, note: `Discovered via ${b.provider}` }],
    notes: "",
  };
}
