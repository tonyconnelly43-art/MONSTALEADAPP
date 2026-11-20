import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authMode, isAuthorized, SESSION_COOKIE } from "./session";

/**
 * Defense in depth for API routes (proxy.ts already checks). Returns a 401/503 response
 * to send back, or null when the request is authorized.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await isAuthorized(token)) return null;
  return authMode() === "locked"
    ? NextResponse.json({ error: "App is locked: set APP_PASSWORD in the deployment's environment variables." }, { status: 503 })
    : NextResponse.json({ error: "Not signed in." }, { status: 401 });
}
