import type { AuditItem, Finding, FindingKey, MiniAudit, Outreach, Prospect } from "../types";
import { FINDING_META } from "../findings";
import { OPPORTUNITY_WEIGHTS, RUBRIC_VERSION, type ScoreResult } from "../scoring/rubric";

export interface SenderInfo {
  name: string | null;
  company: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  region: string;
}

/** Plain-language, non-judgmental description of each observed weakness. */
const OPPORTUNITY_TEXT: Record<FindingKey, string> = {
  https: "The site isn't on HTTPS, so browsers show visitors a \"Not secure\" warning.",
  mobile_viewport: "The site isn't set up for phones, so mobile visitors see a shrunken desktop page.",
  meta_description: "There's no search description, so Google shows auto-generated text under the listing.",
  click_to_call: "The phone number isn't tap-to-call on mobile.",
  copyright_current: "The footer date suggests the site hasn't been updated in a while.",
  clear_headline: "The main headline doesn't say what the company does or where.",
  primary_cta: "There's no clear \"Call now\" or \"Free estimate\" button on the homepage.",
  service_area_stated: "The site doesn't say which towns they serve.",
  logo_present: "No distinct logo was found on the site.",
  favicon_present: "There's no brand icon in the browser tab.",
  name_consistent: "The business name on the site differs from the public listing.",
  social_links: "No social media profiles are linked from the site.",
  local_business_schema: "The site is missing local-business markup that helps it show up in local search.",
  phone_matches_listing: "The phone number on the site differs from the public listing.",
};

/** Short phrases used inside the outreach email (kept friendly; they're about opportunities, not faults). */
const EMAIL_PHRASE: Partial<Record<FindingKey, string>> = {
  https: "the site shows a \"Not secure\" warning in browsers because it isn't on HTTPS",
  mobile_viewport: "on a phone, the site loads as a shrunken desktop page",
  click_to_call: "on mobile, the phone number isn't tap-to-call",
  copyright_current: "the footer date makes the site look like it hasn't been updated recently",
  clear_headline: "the homepage headline doesn't say what you do or where",
  primary_cta: "there isn't a clear \"Call now\" or \"Free estimate\" button on the homepage",
  service_area_stated: "the site doesn't mention the towns you serve",
  logo_present: "I couldn't spot a distinct logo on the site",
  name_consistent: "the name on your site doesn't quite match your Google listing",
  phone_matches_listing: "the phone number on your site doesn't match your Google listing",
  social_links: "the site doesn't link to your social profiles",
  meta_description: "your Google result shows auto-generated text instead of a written description",
};

const STRENGTH_PHRASE: Partial<Record<FindingKey, string>> = {
  primary_cta: "a clear call-to-action",
  service_area_stated: "your service area spelled out",
  clear_headline: "a headline that says what you do",
  logo_present: "a logo on the site",
  click_to_call: "tap-to-call on mobile",
  social_links: "social profiles linked",
};

const SERVICE_RULES: { service: string; keys: FindingKey[] }[] = [
  { service: "Website design", keys: ["https", "mobile_viewport", "click_to_call", "copyright_current", "clear_headline", "primary_cta", "service_area_stated", "meta_description", "local_business_schema"] },
  { service: "Logo & visual identity refresh", keys: ["logo_present", "favicon_present"] },
  { service: "Brand consistency (name, phone, social)", keys: ["name_consistent", "phone_matches_listing", "social_links"] },
];

const domainOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

function item(f: Finding, text: string): AuditItem {
  return { text, findingKey: f.key, evidence: f.evidence };
}

/** "Acme Plumbing, LLC" → "Acme Plumbing" for a natural greeting. */
export function greetingName(name: string): string {
  return name.replace(/[,\s]+(llc|l\.l\.c\.|inc\.?|incorporated|co\.|corp\.?|ltd\.?)$/i, "").trim() || name;
}

/** Recorded findings ranked by rubric weight (biggest opportunity first). */
export function rankedFindings(p: Prospect): { fails: Finding[]; passes: Finding[]; unknowns: Finding[] } {
  const fs = p.analysis?.fetched ? p.analysis.findings : [];
  const byWeight = (a: Finding, b: Finding) => OPPORTUNITY_WEIGHTS[b.key] - OPPORTUNITY_WEIGHTS[a.key];
  return {
    fails: fs.filter((f) => f.result === "fail").sort(byWeight),
    passes: fs.filter((f) => f.result === "pass").sort(byWeight),
    unknowns: fs.filter((f) => f.result === "unknown"),
  };
}

export function buildAudit(p: Prospect, score: ScoreResult): MiniAudit {
  const { fails, passes, unknowns } = rankedFindings(p);
  const uncertainties: string[] = [
    "Vehicle wraps and signage can't be judged from a website. Check their trucks in person or in their photos before pitching wraps.",
  ];
  if (!p.website) uncertainties.unshift("No website is listed, so on-site brand checks weren't possible.");
  else if (!p.analysis) uncertainties.unshift("The website hasn't been analyzed yet.");
  else if (!p.analysis.fetched) uncertainties.unshift(`The website couldn't be analyzed: ${p.analysis.fetchNote ?? "unknown reason"}`);
  for (const u of unknowns) uncertainties.push(`${FINDING_META[u.key].label}: not determined${u.note ? `. ${u.note}` : "."}`);

  const recommendedServices: MiniAudit["recommendedServices"] = [];
  if (!p.website) recommendedServices.push({ service: "Website design", why: "No website is listed for the business." });
  for (const rule of SERVICE_RULES) {
    const hits = fails.filter((f) => rule.keys.includes(f.key));
    if (hits.length && !recommendedServices.some((r) => r.service === rule.service)) {
      recommendedServices.push({ service: rule.service, why: hits.map((h) => FINDING_META[h.key].label.toLowerCase()).join("; ") });
    }
  }
  recommendedServices.push({ service: "Vehicle wraps", why: "To be confirmed. Fleet branding isn't visible from the website." });

  const headline = !p.website
    ? `${p.name} has no website listed. That's a clear website and brand-presence opportunity (score ${score.total}/100).`
    : fails.length
      ? `${fails.length} brand improvement ${fails.length === 1 ? "opportunity" : "opportunities"} observed on ${domainOf(p.website) ?? "their site"} (score ${score.total}/100).`
      : `No on-site weaknesses were observed (score ${score.total}/100). Any pitch should rest on manual review.`;

  return {
    headline,
    opportunities: fails.map((f) => item(f, OPPORTUNITY_TEXT[f.key])),
    strengths: passes.slice(0, 5).map((f) => item(f, FINDING_META[f.key].label)),
    uncertainties,
    recommendedServices,
  };
}

/** Signature, mailing address and opt-out line, always added by code (never by an AI model). */
export function closing(s: SenderInfo): string {
  const signature = [s.name ?? "[Your name]", s.company, s.phone ?? "[Your phone]", s.email ?? "[Your email]"].join("\n");
  return `Thanks,\n${signature}\n\n${s.address ?? "[Your business mailing address]"}\nIf you'd prefer not to hear from me, just reply "no thanks" and I won't follow up.`;
}

export function buildTemplateDraft(p: Prospect, sender: SenderInfo): Outreach["draft"] {
  const { fails, passes } = rankedFindings(p);
  const domain = domainOf(p.website);
  const industry = p.industry.toLowerCase();
  const town = p.city ?? "your area";
  const points = fails.map((f) => EMAIL_PHRASE[f.key]).filter(Boolean).slice(0, 3) as string[];
  const strength = passes.map((f) => STRENGTH_PHRASE[f.key]).find(Boolean);

  const intro = `I'm ${sender.name ?? "[Your name]"} with ${sender.company}, a ${sender.region} design studio that works with home-service companies on logos, vehicle wraps and websites.`;
  let observation: string;
  let subject: string;
  if (!p.website) {
    subject = `${p.name}: a website idea`;
    observation = `I was looking for ${industry} companies in ${town} and couldn't find a website for ${p.name}. A simple, mobile-friendly site that matches your trucks and branding can turn more of those searches into calls.`;
  } else if (points.length) {
    subject = `A few quick notes on ${domain ?? "your website"}`;
    observation = `I took a quick look at ${domain ?? "your website"} and noticed a couple of things that might be costing you calls:\n\n${points.map((t) => `• ${t[0].toUpperCase()}${t.slice(1)}.`).join("\n")}`;
    if (strength) observation += `\n\nYou already have ${strength}, so this is about building on what's working.`;
  } else {
    subject = `Brand idea for ${p.name}`;
    observation = `I came across ${p.name} while looking at ${industry} companies in ${town}. Your website already covers the basics well, and I'd love to show you how a consistent look across your trucks, site and social profiles could make you stand out even more.`;
  }

  const body = [
    `Hi ${greetingName(p.name)} team,`,
    intro,
    observation,
    `Would you be open to a 15-minute call next week? I'm happy to put together a free before/after mockup first, with no obligation.`,
  ].join("\n\n");
  return { subject, body: `${body}\n\n${closing(sender)}` };
}

export function generateTemplateOutreach(p: Prospect, score: ScoreResult, sender: SenderInfo, now = new Date()): Outreach {
  const audit = buildAudit(p, score);
  return {
    generatedAt: now.toISOString(),
    method: "template",
    rubricVersion: RUBRIC_VERSION,
    score: score.total,
    isFictional: p.isFictional,
    audit,
    draft: buildTemplateDraft(p, sender),
  };
}
