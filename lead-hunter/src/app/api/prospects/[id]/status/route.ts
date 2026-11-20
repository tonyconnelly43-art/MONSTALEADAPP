import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getRepo } from "@/lib/server";
import { statusSchema } from "@/lib/validation";

const bodySchema = z.object({ status: statusSchema, note: z.string().max(500).optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth();
  if (denied) return denied;
  const repo = getRepo();
  if (!repo) return NextResponse.json({ error: "No database configured." }, { status: 409 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const result = await repo.setStatus(decodeURIComponent((await ctx.params).id), parsed.data.status, parsed.data.note);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.reason === "Not found." ? 404 : 422 });
  return NextResponse.json({ prospect: result.prospect });
}
