import { NextResponse } from "next/server";
import { z } from "zod";
import { authMode, checkPassword, createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/session";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (authMode() !== "password") {
    return NextResponse.json({ error: "Password sign-in is not configured (APP_PASSWORD is not set)." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await checkPassword(parsed.data.password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return res;
}
