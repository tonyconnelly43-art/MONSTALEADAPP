import type { PageSpeedResult } from "../types";

/**
 * Google PageSpeed Insights v5 (free API; a key raises the quota).
 * https://developers.google.com/speed/docs/insights/v5/get-started
 */
export async function runPageSpeed(url: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<PageSpeedResult> {
  const qs = new URLSearchParams({ url, strategy: "mobile", category: "performance", key: apiKey });
  const res = await fetchImpl(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs}`, {
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const msg = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(`PageSpeed Insights error ${res.status}${msg ? `: ${msg}` : ""}`);
  }
  const data = (await res.json()) as {
    lighthouseResult?: {
      categories?: { performance?: { score?: number | null } };
      audits?: Record<string, { numericValue?: number }>;
    };
  };
  const lr = data.lighthouseResult;
  const score = lr?.categories?.performance?.score;
  return {
    strategy: "mobile",
    performance: typeof score === "number" ? Math.round(score * 100) : null,
    largestContentfulPaintMs: lr?.audits?.["largest-contentful-paint"]?.numericValue ?? null,
    cumulativeLayoutShift: lr?.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
    fetchedAt: new Date().toISOString(),
  };
}
