import { NextResponse } from "next/server";
import { listProviders } from "@/lib/discovery/registry";
import { requireAuth } from "@/lib/auth/requireAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  return NextResponse.json({ providers: listProviders() });
}
