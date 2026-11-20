import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getRepo, googleRetentionDays } from "@/lib/server";
import { googlePlaces } from "@/lib/discovery/registry";
import { PlacesApiError } from "@/lib/discovery/googlePlaces";

/** Re-fetch Google details for one prospect (e.g. after they expired). Billable; requires confirmation. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth();
  if (denied) return denied;
  const repo = getRepo();
  if (!repo) return NextResponse.json({ error: "No database configured." }, { status: 409 });
  const id = decodeURIComponent((await ctx.params).id);
  const prospect = await repo.get(id);
  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (prospect.provider !== "google_places") return NextResponse.json({ error: "Only Google Places prospects can be refreshed." }, { status: 400 });
  if (!googlePlaces.isConfigured()) return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY is not set." }, { status: 400 });

  const { confirmBillable } = z.object({ confirmBillable: z.boolean().default(false) }).parse(await req.json().catch(() => ({})));
  if (!confirmBillable) return NextResponse.json({ error: "Confirmation required", estimate: googlePlaces.detailsEstimate() }, { status: 409 });

  try {
    const { business, billableRequestsMade } = await googlePlaces.fetchDetails(prospect.sourceId);
    const updated = await repo.refreshContent(id, business, googleRetentionDays());
    return NextResponse.json({ prospect: updated, billableRequestsMade });
  } catch (err) {
    if (err instanceof PlacesApiError) return NextResponse.json({ error: err.message }, { status: err.status === 429 ? 429 : 502 });
    console.error("refresh failed", err);
    return NextResponse.json({ error: "Refresh failed." }, { status: 502 });
  }
}
