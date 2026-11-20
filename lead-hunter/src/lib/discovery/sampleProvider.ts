import type { DiscoveryProvider } from "./provider";
import { PILOT_CITIES, SAMPLE_RECORDS } from "./sampleData";
import { ALL_INDUSTRIES } from "./query";

/** Offline provider returning clearly-labeled FICTIONAL businesses. Never makes network calls. */
export const sampleProvider: DiscoveryProvider = {
  id: "sample",
  label: "Sample data (fictional, no API calls)",
  isLive: false,
  isConfigured: () => true,
  estimateCost: () => ({
    billableRequests: 0,
    estimatedUsdBeyondFreeTier: 0,
    explanation: "Sample mode uses built-in fictional data. No external API calls.",
  }),
  async search(q) {
    const notes: string[] = ["All results are FICTIONAL sample data for demonstration only."];
    const inPilot = q.state.toUpperCase() === "OH" && PILOT_CITIES.some((c) => c.toLowerCase() === q.city.trim().toLowerCase());
    if (!inPilot) {
      notes.push(`Sample data only covers the Northeast Ohio pilot area (${PILOT_CITIES.join(", ")}). Connect Google Places (Milestone 2) for nationwide search.`);
      return { businesses: [], notes, billableRequestsMade: 0 };
    }
    notes.push("Radius is simulated: sample search returns all pilot-area communities.");
    const recs = SAMPLE_RECORDS.filter(
      (r) => q.industry === ALL_INDUSTRIES || r.industry.toLowerCase() === q.industry.trim().toLowerCase(),
    );
    if (recs.length === 0) notes.push(`No sample businesses for industry "${q.industry}". Custom industries work with live providers.`);
    const enrichments = Object.fromEntries(
      recs.map((r) => [r.business.sourceId, { analysis: r.analysis, chainSuspected: r.chainSuspected }]),
    );
    return {
      businesses: recs.map((r) => ({ ...r.business })),
      enrichments,
      notes,
      billableRequestsMade: 0,
    };
  },
};

/** Industry lookup for sample records (sample businesses carry their industry). */
export function sampleIndustryFor(sourceId: string): string | undefined {
  return SAMPLE_RECORDS.find((r) => r.business.sourceId === sourceId)?.industry;
}
