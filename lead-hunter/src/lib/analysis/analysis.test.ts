/** Synthetic HTML fixtures only (example.com, 555-01XX numbers). No network access. */
import { describe, expect, it } from "vitest";
import { isBlockedIp, assertFetchableUrl } from "./netGuard";
import { isAllowed } from "./robots";
import { analyzeHtml, findContactUrl } from "./analyzeHtml";
import { analyzeWebsite } from "./analyzeWebsite";
import type { Fetcher, FetchedPage } from "./safeFetch";
import type { Finding, FindingKey } from "../types";

const byKey = (fs: Finding[]) => Object.fromEntries(fs.map((f) => [f.key, f])) as Record<FindingKey, Finding>;
const NOW = new Date("2026-11-20T00:00:00Z");
const listing = { name: "Riverbend Heating & Cooling", phone: "(330) 555-0142", city: "Hudson", industry: "HVAC" };

const STRONG = `<!doctype html><html><head>
<title>Riverbend Heating & Cooling | HVAC Repair in Hudson, OH</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Furnace and AC repair, installation and maintenance for Hudson homeowners since 1998.">
<link rel="icon" href="/favicon.svg">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"HVACBusiness","name":"Riverbend Heating & Cooling"}</script>
</head><body>
<header><a href="/"><img class="site-logo" src="/img/riverbend-logo.svg" alt="Riverbend Heating & Cooling logo"></a>
<a href="tel:+13305550142">(330) 555-0142</a> <a class="btn" href="/book">Schedule Service</a></header>
<h1>Heating & Air Conditioning Repair in Hudson, OH</h1>
<p>Proudly serving Hudson, Stow, Twinsburg and Macedonia with same-day service.</p>
<footer>© 2026 Riverbend Heating & Cooling · <a href="https://www.facebook.com/example">Facebook</a> <a href="/contact-us">Contact</a></footer>
</body></html>`;

const WEAK = `<html><head><title>Home</title></head><body>
<div class="header"><span style="font-size:30px">RB Comfort</span></div>
<h1>Welcome to Our Website</h1>
<p>We have been in business for many years and take pride in our work. Give us a call at 330.555.0199 for all of your needs.
We look forward to hearing from you and appreciate your business. Quality workmanship guaranteed on every job we do for you.</p>
<p>Copyright 2016 RB Comfort Inc.</p></body></html>`;

const SPA = `<html><head><title>Riverbend</title><meta name="viewport" content="width=device-width">
<script src="/a.js"></script><script src="/b.js"></script><script src="/c.js"></script></head>
<body><div id="root"></div></body></html>`;

describe("network guard", () => {
  it("blocks private, loopback, link-local, metadata and mapped addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
    for (const ip of ["93.184.215.14", "8.8.8.8", "2606:4700:4700::1111"]) expect(isBlockedIp(ip), ip).toBe(false);
  });
  it("rejects bad URLs", () => {
    expect(() => assertFetchableUrl("file:///etc/passwd")).toThrow();
    expect(() => assertFetchableUrl("http://localhost/")).toThrow();
    expect(() => assertFetchableUrl("http://127.0.0.1/")).toThrow();
    expect(() => assertFetchableUrl("http://user:pw@example.com/")).toThrow();
    expect(() => assertFetchableUrl("http://example.com:8080/")).toThrow();
    expect(assertFetchableUrl("https://example.com/").hostname).toBe("example.com");
  });
});

describe("robots.txt", () => {
  const txt = `User-agent: *\nDisallow: /private\nAllow: /private/ok\n\nUser-agent: BadBot\nDisallow: /\n\nUser-agent: MonstaLeadHunter\nDisallow: /no-monsta*.html$`;
  it("applies the most specific group and longest-match rule", () => {
    expect(isAllowed(txt, "monstaleadhunter", "/")).toBe(true);
    expect(isAllowed(txt, "monstaleadhunter", "/no-monsta-1.html")).toBe(false);
    expect(isAllowed(txt, "monstaleadhunter", "/private")).toBe(true); // our group overrides *
    expect(isAllowed("User-agent: *\nDisallow: /private\nAllow: /private/ok", "monstaleadhunter", "/private/x")).toBe(false);
    expect(isAllowed("User-agent: *\nDisallow: /private\nAllow: /private/ok", "monstaleadhunter", "/private/ok/1")).toBe(true);
    expect(isAllowed("User-agent: *\nDisallow:", "monstaleadhunter", "/anything")).toBe(true);
    expect(isAllowed("User-agent: *\nDisallow: /", "monstaleadhunter", "/")).toBe(false);
  });
});

describe("analyzeHtml", () => {
  it("passes a strong site with evidence on every finding", () => {
    const f = byKey(analyzeHtml({ homeHtml: STRONG, homeUrl: "https://riverbend.example.com/", faviconIcoFound: null, listing, now: NOW }));
    expect(Object.keys(f)).toHaveLength(14);
    for (const finding of Object.values(f)) {
      expect(finding.result, finding.key).toBe("pass");
      expect(finding.evidence, finding.key).toBeTruthy();
    }
    expect(f.local_business_schema.evidence).toContain("HVACBusiness");
    expect(f.social_links.evidence).toContain("Facebook");
  });

  it("flags weaknesses on a weak site and stays honest about what it couldn't see", () => {
    const f = byKey(analyzeHtml({ homeHtml: WEAK, homeUrl: "http://rbcomfort.example.com/", faviconIcoFound: false, listing, now: NOW }));
    expect(f.https.result).toBe("fail");
    expect(f.mobile_viewport.result).toBe("fail");
    expect(f.meta_description.result).toBe("fail");
    expect(f.click_to_call.result).toBe("fail");
    expect(f.copyright_current).toMatchObject({ result: "fail" });
    expect(f.copyright_current.evidence).toContain("2016");
    expect(f.clear_headline.result).toBe("fail");
    expect(f.primary_cta.result).toBe("fail");
    expect(f.favicon_present.result).toBe("fail");
    expect(f.name_consistent.result).toBe("fail");
    expect(f.phone_matches_listing.result).toBe("fail");
    expect(f.phone_matches_listing.evidence).toContain("(330) 555-0199");
    expect(f.logo_present.confidence).toBe("low");
  });

  it("marks content checks unknown on JavaScript-rendered sites instead of failing them", () => {
    const f = byKey(analyzeHtml({ homeHtml: SPA, homeUrl: "https://riverbend.example.com/", faviconIcoFound: null, listing, now: NOW }));
    for (const k of ["click_to_call", "clear_headline", "primary_cta", "service_area_stated", "logo_present", "social_links", "phone_matches_listing", "copyright_current"] as const) {
      expect(f[k].result, k).toBe("unknown");
      expect(f[k].note, k).toMatch(/JavaScript/);
    }
    expect(f.mobile_viewport.result).toBe("pass"); // head-level checks still work
    expect(f.meta_description.result).toBe("fail");
  });

  it("treats an ambiguous headline as unknown rather than guessing", () => {
    const html = STRONG.replace(/<h1>.*<\/h1>/, "<h1>Comfort You Can Count On</h1>");
    expect(byKey(analyzeHtml({ homeHtml: html, homeUrl: "https://riverbend.example.com/", listing, now: NOW })).clear_headline.result).toBe("unknown");
  });

  it("finds a same-site contact page only", () => {
    expect(findContactUrl(STRONG, "https://riverbend.example.com/")).toBe("https://riverbend.example.com/contact-us");
    expect(findContactUrl('<a href="https://other.example.org/contact">Contact</a>', "https://riverbend.example.com/")).toBeNull();
  });
});

function fakeFetcher(pages: Record<string, Partial<FetchedPage> | Error>): { fetcher: Fetcher; calls: string[] } {
  const calls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    calls.push(url);
    const p = pages[url];
    if (p instanceof Error) throw p;
    if (!p) return { requestedUrl: url, finalUrl: url, status: 404, contentType: "text/html", body: "", truncated: false };
    return { requestedUrl: url, finalUrl: url, status: 200, contentType: "text/html; charset=utf-8", body: "", truncated: false, ...p };
  };
  return { fetcher, calls };
}

describe("analyzeWebsite", () => {
  it("fetches robots, homepage and one contact page, then analyzes", async () => {
    const { fetcher, calls } = fakeFetcher({
      "https://riverbend.example.com/robots.txt": { contentType: "text/plain", body: "User-agent: *\nDisallow: /admin" },
      "https://riverbend.example.com/": { body: STRONG },
      "https://riverbend.example.com/contact-us": { body: "<p>Call (330) 555-0142</p>" },
    });
    const a = await analyzeWebsite({ website: "https://riverbend.example.com/", listing }, { fetcher, now: () => NOW });
    expect(a.fetched).toBe(true);
    expect(a.pagesFetched).toEqual(["https://riverbend.example.com/", "https://riverbend.example.com/contact-us"]);
    expect(calls).toHaveLength(3); // robots + 2 pages; favicon declared so no /favicon.ico request
    expect(a.findings).toHaveLength(14);
    expect(a.pageSpeedNote).toMatch(/not run/);
  });

  it("respects a robots.txt disallow and fetches nothing else", async () => {
    const { fetcher, calls } = fakeFetcher({ "https://riverbend.example.com/robots.txt": { contentType: "text/plain", body: "User-agent: *\nDisallow: /" } });
    const a = await analyzeWebsite({ website: "riverbend.example.com", listing }, { fetcher });
    expect(a.fetched).toBe(false);
    expect(a.fetchNote).toMatch(/robots\.txt disallows/);
    expect(calls).toEqual(["https://riverbend.example.com/robots.txt"]);
  });

  it("treats robots.txt server errors as disallowed (RFC 9309)", async () => {
    const { fetcher } = fakeFetcher({ "https://riverbend.example.com/robots.txt": { status: 503 } });
    expect((await analyzeWebsite({ website: "https://riverbend.example.com", listing }, { fetcher })).fetched).toBe(false);
  });

  it("reports unreachable sites and social-page 'websites' without inventing findings", async () => {
    const { fetcher } = fakeFetcher({ "https://down.example.com/": new Error("ECONNREFUSED") });
    const down = await analyzeWebsite({ website: "https://down.example.com/", listing }, { fetcher });
    expect(down).toMatchObject({ fetched: false, findings: [] });
    expect(down.fetchNote).toMatch(/could not be reached/);
    const fb = await analyzeWebsite({ website: "https://www.facebook.com/somebiz", listing }, { fetcher });
    expect(fb.fetched).toBe(false);
    expect(fb.fetchNote).toMatch(/not a standalone site/);
  });

  it("refuses private addresses before any request", async () => {
    const { fetcher, calls } = fakeFetcher({});
    const a = await analyzeWebsite({ website: "http://169.254.169.254/latest/meta-data", listing }, { fetcher });
    expect(a.fetched).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
