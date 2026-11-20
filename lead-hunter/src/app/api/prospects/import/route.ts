import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getRepo } from "@/lib/server";
import { prospectSchema } from "@/lib/validation";

/** One-time move of prospects saved in a browser (Milestone 1–2) into the shared database. */
export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const repo = getRepo();
  if (!repo) return NextResponse.json({ error: "No database configured." }, { status: 409 });
  const parsed = z.object({ prospects: z.array(prospectSchema).max(1000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid prospect data", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  return NextResponse.json(await repo.addMany(parsed.data.prospects));
}
