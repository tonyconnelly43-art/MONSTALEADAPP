import type { FindingDimension, FindingKey } from "./types";

/** Human-readable metadata for each finding key. Shared by UI, rubric page, and analyzers. */
export const FINDING_META: Record<
  FindingKey,
  { label: string; dimension: FindingDimension; passMeans: string }
> = {
  https: {
    label: "Served over HTTPS",
    dimension: "website_quality",
    passMeans: "Site loads securely (no browser 'Not secure' warning).",
  },
  mobile_viewport: {
    label: "Mobile viewport configured",
    dimension: "website_quality",
    passMeans: "Has a responsive <meta name=\"viewport\"> tag.",
  },
  meta_description: {
    label: "Meta description present",
    dimension: "website_quality",
    passMeans: "Search results show a written description of the business.",
  },
  click_to_call: {
    label: "Click-to-call phone link",
    dimension: "website_quality",
    passMeans: "Phone number is a tappable tel: link.",
  },
  copyright_current: {
    label: "Site appears maintained",
    dimension: "website_quality",
    passMeans: "Footer copyright year is current or last year.",
  },
  clear_headline: {
    label: "Clear headline (H1) states the service",
    dimension: "positioning",
    passMeans: "Main heading says what they do, not just a slogan or the name.",
  },
  primary_cta: {
    label: "Primary call-to-action",
    dimension: "positioning",
    passMeans: "Visible 'Call now', 'Free estimate', 'Book online' style action.",
  },
  service_area_stated: {
    label: "Service area stated",
    dimension: "positioning",
    passMeans: "Names the cities/region they serve.",
  },
  logo_present: {
    label: "Logo detected",
    dimension: "visual_identity",
    passMeans: "An image identified as a logo appears in the header.",
  },
  favicon_present: {
    label: "Favicon present",
    dimension: "visual_identity",
    passMeans: "Browser tab shows a brand icon.",
  },
  name_consistent: {
    label: "Business name consistent",
    dimension: "brand_consistency",
    passMeans: "Name on the site matches the public listing name.",
  },
  social_links: {
    label: "Social profiles linked",
    dimension: "brand_consistency",
    passMeans: "Links to at least one social profile.",
  },
  local_business_schema: {
    label: "LocalBusiness structured data",
    dimension: "brand_consistency",
    passMeans: "Has schema.org LocalBusiness markup for search engines.",
  },
  phone_matches_listing: {
    label: "Phone matches listing",
    dimension: "brand_consistency",
    passMeans: "Phone on the site matches the public listing phone.",
  },
};

export const DIMENSION_LABELS: Record<FindingDimension, string> = {
  website_quality: "Website quality",
  positioning: "Clarity of positioning",
  visual_identity: "Visual identity",
  brand_consistency: "Brand consistency",
};
