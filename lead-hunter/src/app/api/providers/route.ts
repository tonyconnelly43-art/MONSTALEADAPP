import { NextResponse } from "next/server";
import { listProviders } from "@/lib/discovery/registry";

export async function GET() {
  return NextResponse.json({ providers: listProviders() });
}
