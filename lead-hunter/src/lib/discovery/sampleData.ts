/**
 * ⚠️ FICTIONAL SAMPLE DATA ⚠️
 *
 * Every business below is invented for demo purposes. Names include "(Sample)", phone numbers
 * use the reserved 555-01XX fictional range, and websites use the reserved example.com domain.
 * Website "findings" are also invented to demonstrate the scoring rubric. None of this
 * describes a real company. Do not contact any of these "businesses".
 */
import type { Finding, FindingKey, FindingResult, WebsiteAnalysis, DiscoveredBusiness, Confidence } from "../types";
import { FINDING_META } from "../findings";

const RETRIEVED = "2026-11-20T12:00:00.000Z";

type F = [FindingKey, FindingResult, string | null, Confidence?];

function analysis(url: string, rows: F[]): WebsiteAnalysis {
  const findings: Finding[] = rows.map(([key, result, evidence, confidence]) => ({
    key,
    dimension: FINDING_META[key].dimension,
    result,
    evidence: evidence ? `[Fictional] ${evidence}` : null,
    confidence: confidence ?? (result === "unknown" ? "low" : "high"),
    note: result === "unknown" ? "[Fictional] Could not be determined from the fetched page." : undefined,
  }));
  return { analyzedAt: RETRIEVED, url, fetched: true, findings };
}

export interface SampleRecord {
  business: DiscoveredBusiness;
  industry: string;
  chainSuspected: boolean | null;
  analysis: WebsiteAnalysis | null;
}

function biz(
  id: string,
  name: string,
  city: string,
  phone: string | null,
  website: string | null,
  category: string,
  rating: number | null,
  reviewCount: number | null,
): DiscoveredBusiness {
  return {
    provider: "sample",
    sourceId: `sample-${id}`,
    sourceUrl: null,
    isFictional: true,
    name,
    address: `${100 + Number(id) * 7} Example Rd (fictional), ${city}, OH`,
    city,
    state: "OH",
    phone,
    website,
    category,
    rating,
    reviewCount,
    retrievedAt: RETRIEVED,
  };
}

export const SAMPLE_RECORDS: SampleRecord[] = [
  {
    industry: "HVAC",
    chainSuspected: false,
    business: biz("1", "Brightline Comfort Heating & Air (Sample)", "Macedonia", "(330) 555-0101", "https://brightline-hvac.example.com", "HVAC contractor", 4.6, 87),
    analysis: analysis("https://brightline-hvac.example.com", [
      ["https", "fail", "Site served over http:// — browser shows 'Not secure'."],
      ["mobile_viewport", "fail", "No <meta name=\"viewport\"> tag found in <head>."],
      ["meta_description", "fail", "No meta description tag."],
      ["click_to_call", "fail", "Phone shown as plain text image in header; no tel: link."],
      ["copyright_current", "fail", "Footer reads '© 2017 Brightline Comfort'."],
      ["clear_headline", "fail", "H1 is 'Welcome to Our Website'."],
      ["primary_cta", "pass", "Button 'Schedule Service' in header."],
      ["service_area_stated", "pass", "Text 'Serving Macedonia, Northfield & Sagamore Hills'."],
      ["logo_present", "pass", "<img alt=\"Brightline logo\"> in header.", "medium"],
      ["favicon_present", "fail", "No <link rel=\"icon\"> and /favicon.ico returns 404."],
      ["name_consistent", "pass", "Title tag 'Brightline Comfort Heating & Air'."],
      ["social_links", "pass", "Footer links to a Facebook page."],
      ["local_business_schema", "fail", "No JSON-LD structured data found."],
      ["phone_matches_listing", "unknown", null],
    ]),
  },
  {
    industry: "Plumbing",
    chainSuspected: false,
    business: biz("2", "Twin Rivers Plumbing Co. (Sample)", "Twinsburg", "(330) 555-0102", "https://twinrivers-plumbing.example.com", "Plumber", 4.8, 142),
    analysis: analysis("https://twinrivers-plumbing.example.com", [
      ["https", "pass", "HTTPS with valid certificate."],
      ["mobile_viewport", "pass", "viewport meta present."],
      ["meta_description", "pass", "Meta description: '24/7 plumbing repair in Twinsburg…'."],
      ["click_to_call", "pass", "tel: link in header."],
      ["copyright_current", "pass", "Footer '© 2026'."],
      ["clear_headline", "pass", "H1 'Fast, Honest Plumbing in Twinsburg'."],
      ["primary_cta", "pass", "'Call Now' and 'Book Online' buttons above the fold."],
      ["service_area_stated", "pass", "Service area page lists 9 cities."],
      ["logo_present", "pass", "SVG logo in header."],
      ["favicon_present", "pass", "favicon.svg linked."],
      ["name_consistent", "pass", "Name matches listing."],
      ["social_links", "pass", "Facebook and Instagram linked."],
      ["local_business_schema", "pass", "JSON-LD @type Plumber found."],
      ["phone_matches_listing", "pass", "Site phone matches listing phone."],
    ]),
  },
  {
    industry: "Garage Doors",
    chainSuspected: false,
    business: biz("3", "Hudson Overhead Door Pros (Sample)", "Hudson", "(330) 555-0103", "https://hudson-overhead.example.com", "Garage door supplier", 4.3, 31),
    analysis: analysis("https://hudson-overhead.example.com", [
      ["https", "pass", "HTTPS with valid certificate."],
      ["mobile_viewport", "pass", "viewport meta present."],
      ["meta_description", "fail", "Meta description is empty (content=\"\")."],
      ["click_to_call", "fail", "Phone only appears in the footer as plain text."],
      ["copyright_current", "unknown", null],
      ["clear_headline", "fail", "No H1 element on homepage; hero is a slideshow image."],
      ["primary_cta", "fail", "No call-to-action button found above the fold."],
      ["service_area_stated", "fail", "No cities or service area named on the homepage.", "medium"],
      ["logo_present", "fail", "Header shows the business name in plain text; no logo image found.", "medium"],
      ["favicon_present", "fail", "Default website-builder favicon in use."],
      ["name_consistent", "fail", "Site title says 'Hudson Door Service'; listing says 'Hudson Overhead Door Pros'."],
      ["social_links", "fail", "No social profile links found."],
      ["local_business_schema", "fail", "No structured data."],
      ["phone_matches_listing", "pass", "Site phone matches listing phone."],
    ]),
  },
  {
    industry: "Electrical",
    chainSuspected: false,
    business: biz("4", "Solon Spark Electric (Sample)", "Solon", "(440) 555-0104", null, "Electrician", 4.9, 22),
    analysis: null,
  },
  {
    industry: "Roofing",
    chainSuspected: true,
    business: biz("5", "Summit Roofing Systems — Solon Branch (Sample)", "Solon", "(440) 555-0105", "https://summit-roofing-systems.example.com/solon", "Roofing contractor", 4.1, 512),
    analysis: analysis("https://summit-roofing-systems.example.com/solon", [
      ["https", "pass", "HTTPS."],
      ["mobile_viewport", "pass", "viewport meta present."],
      ["meta_description", "pass", "Present."],
      ["click_to_call", "pass", "tel: link."],
      ["copyright_current", "pass", "© 2026."],
      ["clear_headline", "pass", "H1 'Roof Replacement in Solon, OH'."],
      ["primary_cta", "pass", "'Free Inspection' form."],
      ["service_area_stated", "pass", "Location page."],
      ["logo_present", "pass", "Corporate logo."],
      ["favicon_present", "pass", "Present."],
      ["name_consistent", "pass", "Matches."],
      ["social_links", "pass", "National social accounts linked."],
      ["local_business_schema", "pass", "JSON-LD RoofingContractor."],
      ["phone_matches_listing", "fail", "Site shows a national 1-800 number; listing shows local number.", "medium"],
    ]),
  },
  {
    industry: "Landscaping",
    chainSuspected: false,
    business: biz("6", "Green Acre Lawn & Landscape (Sample)", "Aurora", "(330) 555-0106", "https://greenacre-landscape.example.com", "Landscaper", 4.4, 14),
    analysis: analysis("https://greenacre-landscape.example.com", [
      ["https", "pass", "HTTPS."],
      ["mobile_viewport", "fail", "No viewport meta; desktop layout shrinks on phones."],
      ["meta_description", "fail", "None."],
      ["click_to_call", "fail", "No tel: link."],
      ["copyright_current", "fail", "Footer '© 2019'."],
      ["clear_headline", "pass", "H1 'Landscape Design & Lawn Care in Aurora'."],
      ["primary_cta", "fail", "Only a 'Contact' link in the nav; no visible CTA."],
      ["service_area_stated", "pass", "'Aurora, Hudson, Streetsboro and Twinsburg'."],
      ["logo_present", "pass", "Logo image in header (low resolution, 120×40 PNG).", "medium"],
      ["favicon_present", "fail", "No favicon."],
      ["name_consistent", "pass", "Matches."],
      ["social_links", "unknown", null],
      ["local_business_schema", "fail", "No structured data."],
      ["phone_matches_listing", "pass", "Matches."],
    ]),
  },
  {
    industry: "HVAC",
    chainSuspected: false,
    business: biz("7", "Northfield Furnace & Cooling (Sample)", "Northfield", "(330) 555-0107", "https://northfield-furnace.example.com", "Heating contractor", null, null),
    analysis: {
      analyzedAt: RETRIEVED,
      url: "https://northfield-furnace.example.com",
      fetched: false,
      fetchNote: "[Fictional] Site timed out after 10 seconds; no findings recorded.",
      findings: [],
    },
  },
  {
    industry: "Plumbing",
    chainSuspected: null,
    business: biz("8", "Streetsboro Drain Doctors (Sample)", "Streetsboro", "(330) 555-0108", "https://drain-doctors.example.com", "Drainage service", 3.9, 8),
    analysis: analysis("https://drain-doctors.example.com", [
      ["https", "pass", "HTTPS."],
      ["mobile_viewport", "pass", "viewport meta present."],
      ["meta_description", "pass", "Present."],
      ["click_to_call", "fail", "Phone is not a tel: link."],
      ["copyright_current", "pass", "© 2025."],
      ["clear_headline", "fail", "H1 'Doctors You Can Trust' does not mention drains or plumbing."],
      ["primary_cta", "pass", "'Get a Quote' button."],
      ["service_area_stated", "fail", "No service area mentioned."],
      ["logo_present", "pass", "Logo in header.", "medium"],
      ["favicon_present", "pass", "Present."],
      ["name_consistent", "pass", "Matches."],
      ["social_links", "fail", "None found."],
      ["local_business_schema", "fail", "None."],
      ["phone_matches_listing", "pass", "Matches."],
    ]),
  },
  {
    industry: "Electrical",
    chainSuspected: false,
    business: biz("9", "Brecksville Bright Wire Electric (Sample)", "Brecksville", "(440) 555-0109", "https://brightwire.example.com", "Electrical contractor", 4.7, 56),
    analysis: analysis("https://brightwire.example.com", [
      ["https", "fail", "http:// only."],
      ["mobile_viewport", "pass", "viewport meta present."],
      ["meta_description", "fail", "None."],
      ["click_to_call", "pass", "tel: link."],
      ["copyright_current", "fail", "© 2018."],
      ["clear_headline", "fail", "H1 is just the company name."],
      ["primary_cta", "fail", "No CTA above the fold."],
      ["service_area_stated", "pass", "'Serving Brecksville & Broadview Heights'."],
      ["logo_present", "fail", "No logo image detected; header is styled text.", "medium"],
      ["favicon_present", "fail", "None."],
      ["name_consistent", "pass", "Matches."],
      ["social_links", "fail", "None."],
      ["local_business_schema", "fail", "None."],
      ["phone_matches_listing", "pass", "Matches."],
    ]),
  },
  {
    industry: "Roofing",
    chainSuspected: false,
    business: biz("10", "Sagamore Ridge Roofing (Sample)", "Sagamore Hills", "(330) 555-0110", "https://sagamore-roofing.example.com", "Roofing contractor", 4.5, 39),
    analysis: analysis("https://sagamore-roofing.example.com", [
      ["https", "pass", "HTTPS."],
      ["mobile_viewport", "pass", "viewport meta present."],
      ["meta_description", "pass", "Present."],
      ["click_to_call", "pass", "tel: link."],
      ["copyright_current", "fail", "© 2020."],
      ["clear_headline", "pass", "H1 'Residential Roofing in Sagamore Hills'."],
      ["primary_cta", "pass", "'Free Estimate' button."],
      ["service_area_stated", "pass", "Lists 6 cities."],
      ["logo_present", "pass", "Logo present.", "medium"],
      ["favicon_present", "fail", "None."],
      ["name_consistent", "fail", "Site says 'SR Roofing LLC'; listing says 'Sagamore Ridge Roofing'."],
      ["social_links", "pass", "Facebook linked."],
      ["local_business_schema", "fail", "None."],
      ["phone_matches_listing", "pass", "Matches."],
    ]),
  },
  {
    industry: "Garage Doors",
    chainSuspected: false,
    business: biz("11", "Macedonia Garage Door Guys (Sample)", "Macedonia", "(330) 555-0111", "https://www.facebook.com/example-sample-garage", "Garage door supplier", 4.9, 11),
    analysis: null,
  },
  {
    industry: "Landscaping",
    chainSuspected: false,
    business: biz("12", "Twinsburg Turf & Stone (Sample)", "Twinsburg", null, null, "Landscape designer", null, 0),
    analysis: null,
  },
  // Intentional duplicate of #1 (same phone, slightly different name) to demonstrate deduplication.
  {
    industry: "HVAC",
    chainSuspected: false,
    business: biz("13", "Brightline Comfort Heating and Air LLC (Sample)", "Macedonia", "330-555-0101", "http://www.brightline-hvac.example.com/", "HVAC contractor", 4.6, 87),
    analysis: null,
  },
];

/** Cities treated as "within radius" of the pilot area for sample searches. */
export const PILOT_CITIES = [
  "Macedonia", "Twinsburg", "Hudson", "Solon", "Aurora", "Northfield", "Streetsboro", "Brecksville", "Sagamore Hills",
];
