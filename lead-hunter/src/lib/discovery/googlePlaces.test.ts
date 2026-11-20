/**
 * Tests the Google Places provider against a stubbed fetch. The places below are synthetic
 * test fixtures (example.com, 555-01XX numbers) and never reach the UI or storage.
 */
import { describe, expect, it, vi } from "vitest";
import { createGooglePlacesProvider, milesBetween } from "./googlePlaces";
import { createUsageGuard } from "./usageGuard";
import { ALL_INDUSTRIES } from "./query";
import type { SearchQuery } from "../types";

const CENTER = { latitude: 41.3137, longitude: -81.5085 }; // Macedonia, OH (approx.)

function place(id: string, opts: { miles?: number; closed?: boolean; name?: string } = {}) {
  return {
    id,
    displayName: { text: opts.name ?? `Test Co ${id}` },
    formattedAddress: `1 Test St, Macedonia, OH 44056, USA`,
    addressComponents: [
      { longText: "Macedonia", shortText: "Macedonia", types: ["locality", "political"] },
      { longText: "Ohio", shortText: "OH", types: ["administrative_area_level_1", "political"] },
    ],
    // ~69 miles per degree of latitude
    location: { latitude: CENTER.latitude + (opts.miles ?? 1) / 69, longitude: CENTER.longitude },
    nationalPhoneNumber: `(330) 555-01${id.padStart(2, "0").slice(-2)}`,
    websiteUri: `https://${id}.example.com`,
    primaryTypeDisplayName: { text: "HVAC contractor" },
    rating: 4.5,
    userRatingCount: 30,
    googleMapsUri: `https://maps.google.com/?cid=${id}`,
    businessStatus: opts.closed ? "CLOSED_PERMANENTLY" : "OPERATIONAL",
  };
}

function setup(pages: Record<string, unknown>[], cap = 20) {
  const calls: { body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ body, headers: init?.headers as Record<string, string> });
    // First call with pageSize 1 is the city lookup.
    if (body.pageSize === 1) return new Response(JSON.stringify({ places: [{ location: CENTER, formattedAddress: "Macedonia, OH, USA" }] }));
    const next = pages.shift() ?? { places: [] };
    return new Response(JSON.stringify(next));
  });
  const guard = createUsageGuard({ dailyCap: cap });
  const provider = createGooglePlacesProvider({ apiKey: "test-key", guard, fetchImpl: fetchImpl as unknown as typeof fetch });
  return { provider, calls, guard };
}

const Q: SearchQuery = { city: "Macedonia", state: "OH", radiusMiles: 10, industry: "HVAC", limit: 25 };

describe("google places provider", () => {
  it("is disabled without an API key", () => {
    const p = createGooglePlacesProvider({ apiKey: undefined, guard: createUsageGuard({ dailyCap: 5 }) });
    expect(p.isConfigured()).toBe(false);
  });

  it("estimates city lookup + up to 2 pages for a single industry, 1 page each for all industries", () => {
    const { provider } = setup([]);
    expect(provider.estimateCost(Q).billableRequests).toBe(3);
    expect(provider.estimateCost({ ...Q, limit: 10 }).billableRequests).toBe(2);
    expect(provider.estimateCost({ ...Q, industry: ALL_INDUSTRIES }).billableRequests).toBe(7);
  });

  it("sends a field mask, maps fields, enforces radius, skips closed, and paginates", async () => {
    const page1 = { places: [place("1"), place("2", { miles: 30 }), place("3", { closed: true })], nextPageToken: "tok" };
    const page2 = { places: [place("4")] };
    const { provider, calls } = setup([page1, page2]);
    const r = await provider.search(Q);

    expect(calls).toHaveLength(3);
    expect(calls[1].headers["X-Goog-FieldMask"]).toContain("places.websiteUri");
    expect(calls[1].headers["X-Goog-FieldMask"]).not.toContain("places.reviews"); // no unneeded fields
    expect(calls[1].body.textQuery).toBe("HVAC contractor in Macedonia, OH");
    expect(calls[2].body.pageToken).toBe("tok");

    expect(r.businesses.map((b) => b.sourceId)).toEqual(["1", "4"]);
    const b = r.businesses[0];
    expect(b).toMatchObject({ provider: "google_places", isFictional: false, city: "Macedonia", state: "OH", category: "HVAC contractor", sourceUrl: "https://maps.google.com/?cid=1" });
    expect(r.industryBySourceId["1"]).toBe("HVAC");
    expect(r.billableRequestsMade).toBe(3);
    expect(r.notes.join(" ")).toMatch(/1 result outside the radius/);
    expect(r.notes.join(" ")).toMatch(/1 permanently closed/);
  });

  it("serves repeat searches from cache with zero billable calls", async () => {
    const { provider, calls } = setup([{ places: [place("1")] }]);
    await provider.search(Q);
    const before = calls.length;
    expect(provider.estimateCost(Q).billableRequests).toBe(0);
    const again = await provider.search(Q);
    expect(calls.length).toBe(before);
    expect(again.fromCache).toBe(true);
    expect(again.billableRequestsMade).toBe(0);
  });

  it("refuses to run when the daily cap would be exceeded", async () => {
    const { provider, calls } = setup([], 2);
    await expect(provider.search(Q)).rejects.toThrow(/Daily request cap/);
    expect(calls).toHaveLength(0);
  });

  it("surfaces a readable error on a rejected key without exposing it", async () => {
    const guard = createUsageGuard({ dailyCap: 5 });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: { message: "API key not valid." } }), { status: 403 }));
    const p = createGooglePlacesProvider({ apiKey: "secret-key-123", guard, fetchImpl: fetchImpl as unknown as typeof fetch });
    const err = await p.search(Q).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/403/);
    expect((err as Error).message).not.toContain("secret-key-123");
    expect(guard.remainingToday()).toBe(4); // failed call still counted
  });

  it("computes distances in miles", () => {
    expect(milesBetween(CENTER, { latitude: CENTER.latitude + 1, longitude: CENTER.longitude })).toBeCloseTo(69.1, 0);
  });
});
