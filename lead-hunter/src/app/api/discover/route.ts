import { NextResponse } from "next/server";
import { discoverRequestSchema, ALL_INDUSTRIES } from "@/lib/discovery/query";
import { getProvider } from "@/lib/discovery/registry";
import { dedupe } from "@/lib/discovery/dedupe";
import { PlacesApiError } from "@/lib/discovery/googlePlaces";
import { toProspect } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = discoverRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search", issues: parsed.error.issues }, { status: 400 });
  }
  const { provider: providerId, query, confirmBillable } = parsed.data;

  const provider = getProvider(providerId);
  if (!provider || !provider.isConfigured()) {
    return NextResponse.json({ error: `Provider "${providerId}" is not available in this deployment.` }, { status: 400 });
  }

  // Cost guard: a billable provider never runs without explicit confirmation from the user.
  const estimate = provider.estimateCost(query);
  if (provider.isLive && estimate.billableRequests > 0 && !confirmBillable) {
    return NextResponse.json({ error: "Confirmation required", estimate }, { status: 409 });
  }

  try {
    const result = await provider.search(query);
    const { unique, duplicates } = dedupe(result.businesses);
    const limited = unique.slice(0, query.limit);
    const prospects = limited.map((b) => {
      const industry =
        result.industryBySourceId[b.sourceId] ?? (query.industry === ALL_INDUSTRIES ? (b.category ?? "Unknown") : query.industry);
      return toProspect(b, industry, result.enrichments?.[b.sourceId]);
    });
    const notes = [...result.notes];
    if (unique.length > limited.length) notes.push(`Capped at ${query.limit} results (${unique.length - limited.length} more available).`);
    return NextResponse.json({
      prospects,
      duplicatesRemoved: duplicates,
      notes,
      billableRequestsMade: result.billableRequestsMade,
      fromCache: Boolean(result.fromCache),
    });
  } catch (err) {
    if (err instanceof PlacesApiError) {
      // Messages are written to be safe to show (they never include the key).
      return NextResponse.json({ error: err.message }, { status: err.status === 429 ? 429 : 502 });
    }
    console.error("discover failed", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 502 });
  }
}
