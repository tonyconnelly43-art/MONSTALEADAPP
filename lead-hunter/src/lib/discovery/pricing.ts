/**
 * Google Places API (New) list prices used for cost ESTIMATES only.
 * Verify current rates at https://developers.google.com/maps/billing-and-pricing/pricing
 * — Google bills per request by SKU tier, with a free monthly allowance per SKU.
 */
export const PLACES_PRICING = {
  checkedAt: "2026-11",
  /** Text Search requesting phone/website/rating fields → Enterprise tier. */
  textSearchEnterprisePer1000Usd: 35,
  /** Text Search requesting location only (used to locate the city center) → Pro tier. */
  textSearchProPer1000Usd: 32,
  /** Results per Text Search page (API maximum). */
  pageSize: 20,
};
