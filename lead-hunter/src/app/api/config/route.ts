import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { authMode } from "@/lib/auth/session";
import { storageMode, googleRetentionDays } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  return NextResponse.json({ storage: storageMode(), auth: authMode(), googleRetentionDays: googleRetentionDays() });
}
