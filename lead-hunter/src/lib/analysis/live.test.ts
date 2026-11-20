/**
 * Opt-in live checks against public sites (not part of the normal run):
 *   LIVE_NETWORK=1 npx vitest run src/lib/analysis/live.test.ts
 * (behind a proxy: also set NODE_USE_ENV_PROXY=1)
 * If HTTPS_PROXY is set (sandboxed environments), pages are fetched through the proxy with a
 * test-only fetcher; the production SSRF-guarded fetcher connects directly and is tested
 * separately where direct access exists.
 */
import { describe, expect, it } from "vitest";
import { analyzeWebsite } from "./analyzeWebsite";
import type { Fetcher } from "./safeFetch";
import { USER_AGENT } from "./safeFetch";

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const proxyFetcher: Fetcher | undefined = proxy
  ? async (url) => {
      // Node's built-in fetch honors HTTPS_PROXY when run with NODE_USE_ENV_PROXY=1.
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
      return { requestedUrl: url, finalUrl: res.url || url, status: res.status, contentType: res.headers.get("content-type") ?? "", body: await res.text(), truncated: false };
    }
  : undefined;

describe.skipIf(!process.env.LIVE_NETWORK)("live network", () => {
  for (const site of ["https://example.com", "https://www.w3.org"]) {
    it(`analyzes ${site}`, async () => {
      const a = await analyzeWebsite(
        { website: site, listing: { name: site.includes("w3") ? "W3C" : "Example Domain", phone: null, city: null, industry: "HVAC" } },
        { fetcher: proxyFetcher },
      );
      console.log(site, JSON.stringify({ fetched: a.fetched, note: a.fetchNote, pages: a.pagesFetched, findings: a.findings.map((f) => `${f.key}=${f.result}${f.evidence ? ` [${f.evidence.slice(0, 70)}]` : ""}`) }, null, 1));
      expect(a.fetched).toBe(true);
      expect(a.findings).toHaveLength(14);
    }, 60_000);
  }
});
