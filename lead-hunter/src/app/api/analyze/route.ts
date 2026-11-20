import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getRepo } from "@/lib/server";
import { analyzeWebsite } from "@/lib/analysis/analyzeWebsite";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — up to 3 page fetches + optional PageSpeed

const browserProspect = z.object({
  id: z.string().max(300),
  website: z.string().max(2000).nullable(),
  name: z.string().max(300),
  phone: z.string().max(40).nullable(),
  city: z.string().max(120).nullable(),
  industry: z.string().max(100),
  isFictional: z.boolean(),
  contentExpired: z.boolean().optional(),
});
const bodySchema = z.union([z.object({ id: z.string().max(300) }), z.object({ prospect: browserProspect })]);

export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const repo = getRepo();
  let target: z.infer<typeof browserProspect>;
  if (repo) {
    if (!("id" in parsed.data)) return NextResponse.json({ error: "Send the prospect id." }, { status: 400 });
    const p = await repo.get(parsed.data.id);
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    target = p;
  } else {
    if (!("prospect" in parsed.data)) return NextResponse.json({ error: "Send the prospect details (browser-storage mode)." }, { status: 400 });
    target = parsed.data.prospect;
  }

  if (target.isFictional) return NextResponse.json({ error: "Fictional sample businesses use invented findings and aren't analyzed." }, { status: 400 });
  if (target.contentExpired) return NextResponse.json({ error: "Google details for this business expired. Refresh them first." }, { status: 400 });
  if (!target.website) return NextResponse.json({ error: "No website listed for this business." }, { status: 400 });

  const analysis = await analyzeWebsite(
    { website: target.website, listing: { name: target.name, phone: target.phone, city: target.city, industry: target.industry } },
    { pageSpeedKey: process.env.PAGESPEED_API_KEY || undefined },
  );

  if (repo) return NextResponse.json({ prospect: await repo.setAnalysis(target.id, analysis) });
  return NextResponse.json({ analysis });
}
