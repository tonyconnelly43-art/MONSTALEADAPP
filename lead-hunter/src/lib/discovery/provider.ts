import type { DiscoveredBusiness, ProviderId, SearchQuery, WebsiteAnalysis } from "../types";

export const PILOT_MAX_RESULTS = 25;

export interface CostEstimate {
  /** Maximum billable API requests this search may make. */
  billableRequests: number;
  /** Estimated USD if the free monthly allowance is already used up. */
  estimatedUsdBeyondFreeTier: number;
  explanation: string;
}

export interface DiscoveryResult {
  businesses: DiscoveredBusiness[];
  /**
   * Optional pre-computed enrichment keyed by sourceId. Only the fictional sample provider
   * uses this (to demo scoring before real website analysis exists in Milestone 4).
   */
  enrichments?: Record<string, { analysis: WebsiteAnalysis | null; chainSuspected: boolean | null }>;
  /** Industry each business was found under, keyed by sourceId (needed for multi-industry searches). */
  industryBySourceId: Record<string, string>;
  /** Messages to show the user (limitations, empty-result reasons, etc.). */
  notes: string[];
  billableRequestsMade: number;
  /** True when served from the server-side result cache (no API calls made). */
  fromCache?: boolean;
}

/**
 * A legitimate business-data source. Implementations must use official APIs within their
 * terms of service — no scraping of listing sites and no fabricated businesses
 * (except the explicitly fictional "sample" provider).
 */
export interface DiscoveryProvider {
  id: ProviderId;
  label: string;
  /** True if calling search() may incur paid API usage. */
  isLive: boolean;
  /** Whether the provider is usable in this deployment (e.g. API key present). */
  isConfigured(): boolean;
  estimateCost(q: SearchQuery): CostEstimate;
  search(q: SearchQuery): Promise<DiscoveryResult>;
}
