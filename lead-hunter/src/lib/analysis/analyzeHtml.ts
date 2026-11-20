import { parse, type HTMLElement } from "node-html-parser";
import type { Confidence, Finding, FindingKey, FindingResult } from "../types";
import { FINDING_META } from "../findings";
import { INDUSTRY_KEYWORDS } from "../scoring/rubric";
import { normalizeName, normalizePhone } from "../discovery/dedupe";

/**
 * Evidence-based checks on publicly accessible HTML. Every finding records what was observed.
 * When something cannot be determined from static HTML, the result is "unknown" — never a guess.
 */
export interface HtmlAnalysisInput {
  homeHtml: string;
  /** Final URL after redirects. */
  homeUrl: string;
  /** Optional second page (contact/about) from the same site. */
  extraHtml?: string | null;
  extraUrl?: string | null;
  /** Result of checking /favicon.ico when no <link rel=icon> is declared. null = not checked. */
  faviconIcoFound?: boolean | null;
  listing: { name: string | null; phone: string | null; city: string | null; industry: string };
  now?: Date;
}

const CTA_RE = /\b(call (us )?(now|today)|free (estimate|quote|inspection|consultation)|get (a |your )?(free )?(quote|estimate)|request (a )?(quote|estimate|service|appointment)|schedule( service| (an )?appointment| online| now)?|book (now|online|service|an appointment)|contact us today|get started)\b/i;
const SOCIAL_RE = /(?:^|\.)(facebook|instagram|linkedin|youtube|tiktok|twitter|x|nextdoor|pinterest)\.com$/i;
const SERVICE_AREA_RE = /\b(serving|service areas?|areas we serve|proudly serv\w+|we serve|servicing)\b/i;
const GENERIC_H1_RE = /^(welcome|home|homepage|welcome to (our|the) (website|site))\b/i;
const SERVICE_WORDS = ["service", "repair", "install", "replacement", "contractor", "maintenance", "residential", "commercial", "emergency"];
const LOCAL_BUSINESS_TYPES = /(LocalBusiness|HomeAndConstructionBusiness|HVACBusiness|Plumber|Electrician|RoofingContractor|GeneralContractor|HousePainter|Locksmith|MovingCompany|ProfessionalService|LandscapingBusiness|Contractor|Business)$/;
const NAME_STOPWORDS = new Set(["the", "and", "of", "services", "service", "company", "co", "inc", "llc", "corp", "ltd", "group", "pros", "sample"]);

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const snip = (s: string, n = 140) => {
  const c = clean(s);
  return c.length > n ? `${c.slice(0, n - 1)}…` : c;
};

function finding(key: FindingKey, result: FindingResult, evidence: string | null, confidence: Confidence, note?: string): Finding {
  return { key, dimension: FINDING_META[key].dimension, result, evidence, confidence, ...(note ? { note } : {}) };
}

function visibleText(root: HTMLElement): string {
  const clone = parse(root.toString());
  clone.querySelectorAll("script, style, noscript, template, svg").forEach((n) => n.remove());
  return clean(clone.querySelector("body")?.textContent ?? clone.textContent);
}

/** Heuristic: almost no server-rendered text but an app root → content is built by JavaScript. */
function looksClientRendered(root: HTMLElement, text: string): boolean {
  const appRoot = root.querySelector("#root, #__next, #app, #__nuxt, [data-reactroot]");
  const scripts = root.querySelectorAll("script[src]").length;
  return text.length < 250 && (Boolean(appRoot) || scripts >= 3);
}

function nameTokens(name: string): string[] {
  return normalizeName(name).split(" ").filter((t) => t.length > 1 && !NAME_STOPWORDS.has(t));
}

function phonesIn(root: HTMLElement, text: string): string[] {
  const out = new Set<string>();
  root.querySelectorAll('a[href^="tel:" i]').forEach((a) => {
    const n = normalizePhone(a.getAttribute("href")!.slice(4));
    if (n) out.add(n);
  });
  for (const m of text.matchAll(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g)) {
    const n = normalizePhone(m[0]);
    if (n) out.add(n);
  }
  return [...out];
}

function fmtPhone(d: string) {
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function analyzeHtml(input: HtmlAnalysisInput): Finding[] {
  const now = input.now ?? new Date();
  const home = parse(input.homeHtml, { comment: false });
  const extra = input.extraHtml ? parse(input.extraHtml, { comment: false }) : null;
  const homeText = visibleText(home);
  const extraText = extra ? visibleText(extra) : "";
  const allText = `${homeText} ${extraText}`;
  const jsRendered = looksClientRendered(home, homeText);
  const JS_NOTE = "Page content appears to be rendered by JavaScript, so it isn't visible to a static check. Needs a manual look.";
  const findings: Finding[] = [];

  // --- Website quality (head-level checks work even on JS-rendered sites) ---
  const url = new URL(input.homeUrl);
  findings.push(
    url.protocol === "https:"
      ? finding("https", "pass", `Final URL ${url.origin} uses HTTPS.`, "high")
      : finding("https", "fail", `Site is served over plain HTTP (${url.origin}); browsers label it "Not secure".`, "high"),
  );

  const viewport = home.querySelector('meta[name="viewport" i]')?.getAttribute("content");
  findings.push(
    viewport && /width\s*=\s*device-width/i.test(viewport)
      ? finding("mobile_viewport", "pass", `<meta name="viewport" content="${snip(viewport, 80)}">`, "high")
      : viewport
        ? finding("mobile_viewport", "fail", `Viewport tag present but not responsive: content="${snip(viewport, 80)}".`, "medium")
        : finding("mobile_viewport", "fail", 'No <meta name="viewport"> tag, so phones show a shrunken desktop layout.', "high"),
  );

  const desc = home.querySelector('meta[name="description" i]')?.getAttribute("content")?.trim();
  findings.push(
    desc
      ? finding("meta_description", "pass", `Meta description: "${snip(desc)}"`, "high")
      : finding("meta_description", "fail", "No meta description, so search results show auto-generated text.", "high"),
  );

  if (jsRendered) {
    findings.push(finding("click_to_call", "unknown", null, "low", JS_NOTE));
  } else {
    const tel = home.querySelector('a[href^="tel:" i]');
    findings.push(
      tel
        ? finding("click_to_call", "pass", `Tap-to-call link: ${snip(tel.getAttribute("href")!, 40)}`, "high")
        : finding("click_to_call", "fail", "No tel: link on the homepage, so mobile visitors can't tap to call.", "medium"),
    );
  }

  const years = [...allText.matchAll(/(?:©|&copy;|\(c\)|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  const year = years.length ? Math.max(...years) : null;
  if (year == null) {
    findings.push(finding("copyright_current", "unknown", null, "low", jsRendered ? JS_NOTE : "No copyright year found in the page text."));
  } else {
    const current = now.getUTCFullYear();
    findings.push(
      year >= current - 1
        ? finding("copyright_current", "pass", `Copyright year ${year}.`, "medium")
        : finding("copyright_current", "fail", `Footer copyright year is ${year} (${current - year} years old), which suggests the site isn't actively maintained.`, "medium"),
    );
  }

  // --- Positioning ---
  const h1 = clean(home.querySelector("h1")?.textContent ?? "");
  if (jsRendered) {
    findings.push(finding("clear_headline", "unknown", null, "low", JS_NOTE));
  } else if (!h1) {
    findings.push(finding("clear_headline", "fail", "No <h1> heading on the homepage, so the main message isn't stated in text.", "high"));
  } else {
    const kw = INDUSTRY_KEYWORDS[input.listing.industry] ?? [input.listing.industry.toLowerCase()];
    const lower = h1.toLowerCase();
    const namesService = kw.some((k) => lower.includes(k)) || SERVICE_WORDS.some((w) => lower.includes(w));
    const isJustName = input.listing.name ? normalizeName(h1) === normalizeName(input.listing.name) : false;
    if (namesService) findings.push(finding("clear_headline", "pass", `H1: "${snip(h1, 100)}"`, "medium"));
    else if (GENERIC_H1_RE.test(h1) || isJustName)
      findings.push(finding("clear_headline", "fail", `H1 is "${snip(h1, 100)}", which doesn't say what they do.`, "medium"));
    else findings.push(finding("clear_headline", "unknown", `H1: "${snip(h1, 100)}"`, "low", "Headline doesn't name a recognizable service. Needs a human judgment."));
  }

  if (jsRendered) {
    findings.push(finding("primary_cta", "unknown", null, "low", JS_NOTE));
  } else {
    const ctaEl = home
      .querySelectorAll("a, button, input[type=submit]")
      .find((el) => CTA_RE.test(clean(el.textContent || el.getAttribute("value") || el.getAttribute("aria-label") || "")));
    findings.push(
      ctaEl
        ? finding("primary_cta", "pass", `Call-to-action: "${snip(ctaEl.textContent || ctaEl.getAttribute("value") || ctaEl.getAttribute("aria-label") || "", 60)}"`, "medium")
        : finding("primary_cta", "fail", "No call-to-action link or button found on the homepage (e.g. 'Call now', 'Free estimate', 'Book online').", "medium"),
    );
  }

  if (jsRendered && !extra) {
    findings.push(finding("service_area_stated", "unknown", null, "low", JS_NOTE));
  } else {
    const m = allText.match(new RegExp(`.{0,60}${SERVICE_AREA_RE.source}.{0,80}`, "i"));
    const city = input.listing.city;
    const cityHit = city ? allText.match(new RegExp(`.{0,50}\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b.{0,50}`, "i")) : null;
    if (m) findings.push(finding("service_area_stated", "pass", `"${snip(m[0])}"`, "medium"));
    else if (cityHit) findings.push(finding("service_area_stated", "pass", `Mentions ${city}: "${snip(cityHit[0])}"`, "low"));
    else findings.push(finding("service_area_stated", "fail", `No service-area wording${city ? ` or mention of ${city}` : ""} found${extra ? " on the homepage or contact page" : " on the homepage"}.`, "medium"));
  }

  // --- Visual identity ---
  const logo = home
    .querySelectorAll("img, svg, a, div, span")
    .find((el) => /logo/i.test(`${el.getAttribute("alt") ?? ""} ${el.getAttribute("src") ?? ""} ${el.getAttribute("class") ?? ""} ${el.getAttribute("id") ?? ""}`) && (el.tagName === "IMG" || el.tagName === "SVG" || el.querySelector("img, svg")));
  if (logo) {
    const img = logo.tagName === "IMG" || logo.tagName === "SVG" ? logo : logo.querySelector("img, svg")!;
    const desc2 = img.tagName === "SVG" ? "inline SVG" : `<img ${img.getAttribute("alt") ? `alt="${snip(img.getAttribute("alt")!, 50)}" ` : ""}src="${snip(img.getAttribute("src") ?? "", 70)}">`;
    findings.push(finding("logo_present", "pass", `Logo element found: ${desc2}`, "medium"));
  } else if (jsRendered) {
    findings.push(finding("logo_present", "unknown", null, "low", JS_NOTE));
  } else {
    findings.push(finding("logo_present", "fail", "No image marked as a logo (by alt text, file name, class or id) on the homepage. The brand may be plain text only.", "low", "A logo could still be present without 'logo' in its markup. Confirm visually."));
  }

  const iconLink = home.querySelector('link[rel~="icon" i], link[rel="shortcut icon" i], link[rel="apple-touch-icon" i]');
  if (iconLink) findings.push(finding("favicon_present", "pass", `<link rel="${iconLink.getAttribute("rel")}" href="${snip(iconLink.getAttribute("href") ?? "", 70)}">`, "high"));
  else if (input.faviconIcoFound === true) findings.push(finding("favicon_present", "pass", "/favicon.ico is served (no <link rel=icon> declared).", "high"));
  else if (input.faviconIcoFound === false) findings.push(finding("favicon_present", "fail", "No favicon declared and /favicon.ico isn't available, so the browser tab shows a generic icon.", "high"));
  else findings.push(finding("favicon_present", "unknown", null, "low", "/favicon.ico could not be checked."));

  // --- Brand consistency ---
  const title = clean(home.querySelector("title")?.textContent ?? "");
  const ogSite = home.querySelector('meta[property="og:site_name" i]')?.getAttribute("content") ?? "";
  const logoAlt = home.querySelector('img[alt*="logo" i]')?.getAttribute("alt") ?? "";
  if (!input.listing.name) {
    findings.push(finding("name_consistent", "unknown", null, "low", "Listing name not available to compare."));
  } else {
    const tokens = nameTokens(input.listing.name);
    const hay = normalizeName(`${title} ${ogSite} ${h1} ${logoAlt}`);
    const hit = tokens.filter((t) => hay.split(" ").includes(t));
    const ratio = tokens.length ? hit.length / tokens.length : 0;
    if (!title && !ogSite && !h1) findings.push(finding("name_consistent", "unknown", null, "low", "No title, site name or heading to compare."));
    else if (ratio >= 0.6) findings.push(finding("name_consistent", "pass", `Site title "${snip(title || ogSite, 80)}" matches listing "${input.listing.name}".`, "medium"));
    else findings.push(finding("name_consistent", "fail", `Site presents as "${snip(title || ogSite || h1, 80)}"; listing name is "${input.listing.name}".`, "medium"));
  }

  const socials = new Set<string>();
  for (const root of [home, extra].filter(Boolean) as HTMLElement[]) {
    root.querySelectorAll("a[href]").forEach((a) => {
      try {
        const host = new URL(a.getAttribute("href")!, input.homeUrl).hostname.replace(/^www\./, "");
        const m = host.match(SOCIAL_RE);
        if (m) socials.add(m[1].toLowerCase() === "x" ? "X/Twitter" : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase());
      } catch {
        // ignore malformed hrefs
      }
    });
  }
  findings.push(
    socials.size
      ? finding("social_links", "pass", `Links to ${[...socials].join(", ")}.`, "high")
      : jsRendered
        ? finding("social_links", "unknown", null, "low", JS_NOTE)
        : finding("social_links", "fail", "No links to social profiles found.", "medium"),
  );

  const ldTypes: string[] = [];
  for (const s of home.querySelectorAll('script[type="application/ld+json" i]')) {
    try {
      const walk = (v: unknown): void => {
        if (Array.isArray(v)) return v.forEach(walk);
        if (v && typeof v === "object") {
          const t = (v as Record<string, unknown>)["@type"];
          (Array.isArray(t) ? t : [t]).forEach((x) => typeof x === "string" && ldTypes.push(x));
          Object.values(v).forEach(walk);
        }
      };
      walk(JSON.parse(s.textContent));
    } catch {
      // malformed JSON-LD is ignored
    }
  }
  const localType = ldTypes.find((t) => LOCAL_BUSINESS_TYPES.test(t));
  findings.push(
    localType
      ? finding("local_business_schema", "pass", `JSON-LD @type "${localType}".`, "high")
      : finding("local_business_schema", "fail", ldTypes.length ? `Structured data present (${[...new Set(ldTypes)].slice(0, 3).join(", ")}) but no LocalBusiness type.` : "No schema.org structured data found.", "high"),
  );

  const listingPhone = normalizePhone(input.listing.phone);
  if (!listingPhone) {
    findings.push(finding("phone_matches_listing", "unknown", null, "low", "Listing phone not available to compare."));
  } else {
    const found = [...new Set([...phonesIn(home, homeText), ...(extra ? phonesIn(extra, extraText) : [])])];
    if (found.includes(listingPhone)) findings.push(finding("phone_matches_listing", "pass", `Site shows ${fmtPhone(listingPhone)}, matching the listing.`, "high"));
    else if (found.length) findings.push(finding("phone_matches_listing", "fail", `Site shows ${found.slice(0, 2).map(fmtPhone).join(", ")}; listing has ${fmtPhone(listingPhone)}.`, "medium"));
    else findings.push(finding("phone_matches_listing", "unknown", null, "low", jsRendered ? JS_NOTE : "No phone number found on the fetched pages."));
  }

  return findings;
}

/** Same-site contact/about page link, if any (used to fetch one extra page). */
export function findContactUrl(homeHtml: string, homeUrl: string): string | null {
  const root = parse(homeHtml);
  const origin = new URL(homeUrl).origin;
  const candidates = root.querySelectorAll("a[href]").map((a) => ({ href: a.getAttribute("href")!, text: clean(a.textContent).toLowerCase() }));
  const pick = candidates.find((c) => /contact/.test(c.text) || /\/contact/i.test(c.href)) ?? candidates.find((c) => /about/.test(c.text) || /\/about/i.test(c.href));
  if (!pick) return null;
  try {
    const u = new URL(pick.href, homeUrl);
    if (u.origin !== origin || u.pathname === new URL(homeUrl).pathname) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function hasIconLink(homeHtml: string): boolean {
  return Boolean(parse(homeHtml).querySelector('link[rel~="icon" i], link[rel="shortcut icon" i], link[rel="apple-touch-icon" i]'));
}
