import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getRepo } from "@/lib/server";

export const dynamic = "force-dynamic";

const noDb = () => NextResponse.json({ error: "No database configured; prospects are stored in the browser." }, { status: 409 });

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  const repo = getRepo();
  if (!repo) return noDb();
  return NextResponse.json({ prospects: await repo.list() });
}

const deleteSchema = z.object({ ids: z.array(z.string().max(300)).min(1).max(1000) });

export async function DELETE(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const repo = getRepo();
  if (!repo) return noDb();
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  return NextResponse.json({ removed: await repo.remove(parsed.data.ids) });
}
