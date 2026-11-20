import { PRESET_INDUSTRIES, type DiscoveredBusiness, type SearchQuery } from "../types";
import type { CostEstimate, DiscoveryProvider, DiscoveryResult } from "./provider";
import { ALL_INDUSTRIES } from "./query";
import { PLACES_PRICING } from "./pricing";
import type { UsageGuard } from "./usageGuard";

/**
 * Google Places API (New) — Text Search.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Cost controls:
 *  - Field masks request ONLY the fields we store (billing tier is set by the fields requested).
 *  - At most 2 pages (40 results) per industry; 1 page per industry for "All target industries".
 *  - City centers and full search results are cached (default 24h).
 *  - Daily request cap enforced before any call; callers must confirm billable searches.
 */
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

/** Place Details uses the same fields without the "places." prefix. */
const DETAILS_FIELDS = SEARCH_FIELDS.split(",")
  .filter((f) => f.startsWith("places."))
  .map((f) => f.replace(/^places\./, ""))
  .join(",");

const GEOCODE_FIELDS = "places.location,places.formattedAddress";

/** Search phrases that match how Google categorizes these trades. */
const INDUSTRY_QUERY: Record<string, string> = {
  HVAC: "HVAC contractor",
  Plumbing: "plumber",
  "Garage Doors": "garage door company",
  Electrical: "electrician",
  Roofing: "roofing contractor",
  Landscaping: "landscaping company",
};

const MAX_PAGES_SINGLE = 2;
const METERS_PER_MILE = 1609.344;
const MAX_BIAS_METERS = 50_000; // API maximum for circle radius

interface LatLng { latitude: number; longitude: number }

interface PlaceResponse {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  location?: LatLng;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  primaryTypeDisplayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
}

interface SearchResponse { places?: PlaceResponse[]; nextPageToken?: string }

export class PlacesApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function milesBetween(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function industriesFor(q: SearchQuery): string[] {
  return q.industry === ALL_INDUSTRIES ? [...PRESET_INDUSTRIES] : [q.industry];
}

function pagesPerIndustry(q: SearchQuery): number {
  return q.industry === ALL_INDUSTRIES ? 1 : Math.min(MAX_PAGES_SINGLE, Math.ceil(q.limit / PLACES_PRICING.pageSize));
}

const cityKey = (q: SearchQuery) => `geo:${q.city.trim().toLowerCase()}|${q.state.toUpperCase()}`;
const searchKey = (q: SearchQuery) =>
  `search:${q.city.trim().toLowerCase()}|${q.state.toUpperCase()}|${q.radiusMiles}|${q.industry.trim().toLowerCase()}|${q.limit}`;

function toBusiness(p: PlaceResponse, retrievedAt: string): DiscoveredBusiness {
  const comp = (type: string) => p.addressComponents?.find((c) => c.types.includes(type));
  const city = comp("locality") ?? comp("postal_town") ?? comp("sublocality") ?? comp("administrative_area_level_3");
  return {
    provider: "google_places",
    sourceId: p.id,
    sourceUrl: p.googleMapsUri ?? null,
    isFictional: false,
    name: p.displayName?.text ?? "(unnamed)",
    address: p.formattedAddress ?? null,
    city: city?.longText ?? null,
    state: comp("administrative_area_level_1")?.shortText ?? null,
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    category: p.primaryTypeDisplayName?.text ?? null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    retrievedAt,
  };
}

export interface GooglePlacesDeps {
  apiKey: string | undefined;
  guard: UsageGuard;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface GooglePlacesProvider extends DiscoveryProvider {
  /** Fetch current details for one place (used to refresh expired details). One billable request. */
  fetchDetails(placeId: string): Promise<{ business: DiscoveredBusiness; billableRequestsMade: number }>;
  detailsEstimate(): CostEstimate;
}

export function createGooglePlacesProvider(deps: GooglePlacesDeps): GooglePlacesProvider {
  const doFetch = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const { guard } = deps;

  async function request<T>(url: string, body: Record<string, unknown> | null, fieldMask: string, tally: { n: number }): Promise<T> {
    if (!deps.apiKey) throw new PlacesApiError("GOOGLE_PLACES_API_KEY is not set.", 500);
    let res: Response;
    try {
      res = await doFetch(url, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": deps.apiKey, "X-Goog-FieldMask": fieldMask },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } finally {
      // Count every attempted request against the daily cap, even failures.
      tally.n++;
      await guard.record(1);
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => null) as { error?: { message?: string; status?: string } } | null;
      const msg = detail?.error?.message ?? res.statusText;
      if (res.status === 403) throw new PlacesApiError(`Google rejected the API key (403): ${msg}. Check that "Places API (New)" is enabled and the key restrictions allow it.`, 403);
      if (res.status === 429) throw new PlacesApiError("Google quota exceeded (429). Try again later or raise the quota in Google Cloud.", 429);
      if (/api key/i.test(msg)) throw new PlacesApiError(`Google says the API key is invalid: ${msg} Check GOOGLE_PLACES_API_KEY in your environment variables.`, res.status);
      throw new PlacesApiError(`Google Places error ${res.status}: ${msg}`, res.status);
    }
    return (await res.json()) as T;
  }

  const call = (body: Record<string, unknown>, fieldMask: string, tally: { n: number }) =>
    request<SearchResponse>(ENDPOINT, body, fieldMask, tally);

  async function locateCity(q: SearchQuery, tally: { n: number }): Promise<{ center: LatLng; label: string } | null> {
    const cached = guard.getCached<{ center: LatLng; label: string }>(cityKey(q));
    if (cached) return cached;
    const data = await call({ textQuery: `${q.city}, ${q.state}, USA`, pageSize: 1, regionCode: "US" }, GEOCODE_FIELDS, tally);
    const top = data.places?.[0];
    if (!top?.location) return null;
    const result = { center: top.location, label: top.formattedAddress ?? `${q.city}, ${q.state}` };
    guard.setCached(cityKey(q), result);
    return result;
  }

  function estimate(q: SearchQuery): CostEstimate {
    if (guard.getCached(searchKey(q))) {
      return { billableRequests: 0, estimatedUsdBeyondFreeTier: 0, explanation: "Identical search ran in the last 24 hours — results will come from cache at no cost." };
    }
    const geocode = guard.getCached(cityKey(q)) ? 0 : 1;
    const searches = industriesFor(q).length * pagesPerIndustry(q);
    const usd = (geocode * PLACES_PRICING.textSearchProPer1000Usd + searches * PLACES_PRICING.textSearchEnterprisePer1000Usd) / 1000;
    return {
      billableRequests: geocode + searches,
      estimatedUsdBeyondFreeTier: Math.round(usd * 1000) / 1000,
      explanation:
        `Up to ${searches} Text Search request${searches === 1 ? "" : "s"} (Enterprise tier: phone, website, rating)` +
        (geocode ? " + 1 request to locate the city center (Pro tier)" : "") +
        `. $0 while within Google's free monthly allowance; otherwise about $${usd.toFixed(3)} at list prices checked ${PLACES_PRICING.checkedAt}.`,
    };
  }

  function detailsEstimate(): CostEstimate {
    const usd = PLACES_PRICING.placeDetailsEnterprisePer1000Usd / 1000;
    return {
      billableRequests: 1,
      estimatedUsdBeyondFreeTier: usd,
      explanation: `1 Place Details request (Enterprise tier). $0 while within Google's free monthly allowance; otherwise about $${usd.toFixed(3)} at list prices checked ${PLACES_PRICING.checkedAt}.`,
    };
  }

  return {
    id: "google_places",
    detailsEstimate,
    async fetchDetails(placeId) {
      if ((await guard.remainingToday()) < 1) {
        throw new PlacesApiError("Daily request cap reached. Raise PLACES_DAILY_REQUEST_CAP or try tomorrow.", 429);
      }
      const tally = { n: 0 };
      const p = await request<PlaceResponse>(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        null,
        DETAILS_FIELDS,
        tally,
      );
      return { business: toBusiness(p, now().toISOString()), billableRequestsMade: tally.n };
    },
    label: "Google Places API (live)",
    isLive: true,
    isConfigured: () => Boolean(deps.apiKey),
    estimateCost: estimate,

    async search(q): Promise<DiscoveryResult> {
      const cached = guard.getCached<DiscoveryResult>(searchKey(q));
      if (cached) {
        return { ...cached, billableRequestsMade: 0, fromCache: true, notes: ["Served from the 24-hour cache — no API calls made.", ...cached.notes] };
      }

      const est = estimate(q);
      const remaining = await guard.remainingToday();
      if (est.billableRequests > remaining) {
        throw new PlacesApiError(
          `Daily request cap reached: this search needs up to ${est.billableRequests} requests, ${remaining} remain today. Raise PLACES_DAILY_REQUEST_CAP or try tomorrow.`,
          429,
        );
      }

      const notes: string[] = [];
      const retrievedAt = now().toISOString();
      const tally = { n: 0 };

      const city = await locateCity(q, tally);
      if (!city) {
        return { businesses: [], industryBySourceId: {}, notes: [`Could not locate "${q.city}, ${q.state}".`], billableRequestsMade: tally.n };
      }

      const radiusMeters = Math.min(q.radiusMiles * METERS_PER_MILE, MAX_BIAS_METERS);
      const perIndustry: { industry: string; items: DiscoveredBusiness[] }[] = [];
      const industryBySourceId: Record<string, string> = {};
      let outsideRadius = 0;
      let closed = 0;

      for (const industry of industriesFor(q)) {
        const phrase = INDUSTRY_QUERY[industry] ?? industry;
        const items: DiscoveredBusiness[] = [];
        let pageToken: string | undefined;
        let pages = 0;
        do {
          const data = await call(
            {
              textQuery: `${phrase} in ${q.city}, ${q.state}`,
              pageSize: PLACES_PRICING.pageSize,
              regionCode: "US",
              locationBias: { circle: { center: city.center, radius: radiusMeters } },
              ...(pageToken ? { pageToken } : {}),
            },
            SEARCH_FIELDS,
            tally,
          );
          pages++;
          for (const p of data.places ?? []) {
            if (p.businessStatus === "CLOSED_PERMANENTLY") { closed++; continue; }
            // locationBias only prefers the area; enforce the radius ourselves.
            if (p.location && milesBetween(city.center, p.location) > q.radiusMiles) { outsideRadius++; continue; }
            if (industryBySourceId[p.id]) continue; // already found under another industry
            industryBySourceId[p.id] = industry;
            items.push(toBusiness(p, retrievedAt));
          }
          pageToken = data.nextPageToken;
        } while (pageToken && pages < pagesPerIndustry(q) && items.length < q.limit);
        perIndustry.push({ industry, items });
      }

      // Interleave industries so a capped "All industries" search stays balanced.
      const businesses: DiscoveredBusiness[] = [];
      for (let i = 0; perIndustry.some((g) => i < g.items.length); i++) {
        for (const g of perIndustry) if (g.items[i]) businesses.push(g.items[i]);
      }

      notes.push(`Searched around ${city.label} within ${q.radiusMiles} mi.`);
      if (outsideRadius) notes.push(`${outsideRadius} result${outsideRadius === 1 ? "" : "s"} outside the radius excluded.`);
      if (closed) notes.push(`${closed} permanently closed business${closed === 1 ? "" : "es"} excluded.`);
      if (businesses.length === 0) notes.push("Google returned no matching businesses for this search.");

      const result: DiscoveryResult = {
        businesses,
        industryBySourceId,
        notes,
        billableRequestsMade: tally.n,
      };
      guard.setCached(searchKey(q), result);
      return result;
    },
  };
}
