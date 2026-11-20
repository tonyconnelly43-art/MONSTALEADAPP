import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getRepo } from "@/lib/server";
import { patchSchema } from "@/lib/validation";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth();
  if (denied) return denied;
  const repo = getRepo();
  if (!repo) return NextResponse.json({ error: "No database configured." }, { status: 409 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  const prospect = await repo.update(decodeURIComponent((await ctx.params).id), parsed.data);
  return prospect ? NextResponse.json({ prospect }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
