import type { WebsiteAnalysis } from "../types";
import { analyzeHtml, findContactUrl, hasIconLink } from "./analyzeHtml";
import { assertFetchableUrl, BlockedUrlError } from "./netGuard";
import { createRobotsChecker, safeFetch, type Fetcher } from "./safeFetch";
import { runPageSpeed } from "./pagespeed";

export interface AnalyzeInput {
  website: string;
  listing: { name: string | null; phone: string | null; city: string | null; industry: string };
}

export interface AnalyzeDeps {
  fetcher?: Fetcher;
  pageSpeedKey?: string;
  pageSpeedFetch?: typeof fetch;
  now?: () => Date;
}

const SHARED_HOSTS = /(^|\.)(facebook|instagram|yelp|google|linktr|nextdoor|angi|homeadvisor|thumbtack)\.(com|ee|site)$/i;

/**
 * Reads at most two public pages (homepage + one contact/about page) plus /favicon.ico,
 * honoring robots.txt. Never logs in, submits forms, or crawls further.
 */
export async function analyzeWebsite(input: AnalyzeInput, deps: AnalyzeDeps = {}): Promise<WebsiteAnalysis> {
  const fetcher = deps.fetcher ?? safeFetch;
  const now = deps.now ?? (() => new Date());
  const robots = createRobotsChecker(fetcher);
  const notFetched = (url: string, fetchNote: string): WebsiteAnalysis => ({
    analyzedAt: now().toISOString(), url, fetched: false, fetchNote, findings: [], pagesFetched: [],
  });

  let start: URL;
  try {
    start = assertFetchableUrl(/^https?:\/\//i.test(input.website) ? input.website : `https://${input.website}`);
  } catch (e) {
    return notFetched(input.website, `Not analyzed: ${(e as Error).message}`);
  }
  if (SHARED_HOSTS.test(start.hostname)) {
    return notFetched(start.toString(), `The listed "website" is a ${start.hostname} page, not a standalone site. That's a website-design opportunity, but there's nothing on-site to analyze.`);
  }

  const gate = await robots(start.toString());
  if (!gate.allowed) return notFetched(start.toString(), `Not analyzed: ${gate.reason}`);

  let home;
  try {
    home = await fetcher(start.toString());
  } catch (e) {
    const msg = e instanceof BlockedUrlError || (e as { cause?: unknown }).cause instanceof BlockedUrlError
      ? "the address resolves to a private or reserved network."
      : (e as Error).name === "TimeoutError" ? "the site did not respond within 10 seconds." : `the site could not be reached (${(e as Error).message}).`;
    return notFetched(start.toString(), `Not analyzed: ${msg}`);
  }
  if (home.status >= 400) return notFetched(home.finalUrl, `Not analyzed: the site returned HTTP ${home.status}.`);
  if (!/html/i.test(home.contentType)) return notFetched(home.finalUrl, `Not analyzed: the homepage isn't HTML (${home.contentType || "unknown type"}).`);
  const finalUrl = new URL(home.finalUrl);
  if (finalUrl.origin !== start.origin) {
    if (SHARED_HOSTS.test(finalUrl.hostname)) return notFetched(home.finalUrl, `The website redirects to ${finalUrl.hostname}; there's no standalone site to analyze.`);
    const g2 = await robots(home.finalUrl);
    if (!g2.allowed) return notFetched(home.finalUrl, `Not analyzed: ${g2.reason}`);
  }
  const pagesFetched = [home.finalUrl];

  // One extra page: contact/about (same site, robots permitting).
  let extraHtml: string | null = null;
  let extraUrl: string | null = null;
  const contact = findContactUrl(home.body, home.finalUrl);
  if (contact && (await robots(contact)).allowed) {
    try {
      const page = await fetcher(contact, { maxBytes: 1_000_000 });
      if (page.status < 400 && /html/i.test(page.contentType)) {
        extraHtml = page.body;
        extraUrl = page.finalUrl;
        pagesFetched.push(page.finalUrl);
      }
    } catch {
      // optional page; ignore failures
    }
  }

  // Favicon fallback check only when none is declared.
  let faviconIcoFound: boolean | null = null;
  if (!hasIconLink(home.body)) {
    const ico = `${finalUrl.origin}/favicon.ico`;
    if ((await robots(ico)).allowed) {
      try {
        const r = await fetcher(ico, { maxBytes: 200_000, accept: "image/*" });
        faviconIcoFound = r.status === 200 && /image|icon|octet-stream/i.test(r.contentType) && r.body.length > 0;
      } catch {
        faviconIcoFound = null;
      }
    }
  }

  const findings = analyzeHtml({
    homeHtml: home.body,
    homeUrl: home.finalUrl,
    extraHtml,
    extraUrl,
    faviconIcoFound,
    listing: input.listing,
    now: now(),
  });

  const analysis: WebsiteAnalysis = {
    analyzedAt: now().toISOString(),
    url: home.finalUrl,
    fetched: true,
    findings,
    pagesFetched,
    ...(home.truncated ? { fetchNote: "Homepage was larger than 1.5 MB; only the first 1.5 MB was analyzed." } : {}),
  };

  if (deps.pageSpeedKey) {
    try {
      analysis.pageSpeed = await runPageSpeed(home.finalUrl, deps.pageSpeedKey, deps.pageSpeedFetch);
    } catch (e) {
      analysis.pageSpeed = null;
      analysis.pageSpeedNote = (e as Error).message;
    }
  } else {
    analysis.pageSpeedNote = "PageSpeed not run (PAGESPEED_API_KEY not set).";
  }
  return analysis;
}
