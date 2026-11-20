/**
 * Minimal shared-password auth for a small internal team.
 *
 *  - APP_PASSWORD set        → password required; a signed, HttpOnly session cookie is issued.
 *  - APP_PASSWORD unset, on Vercel → app is LOCKED (prevents an accidentally public deployment
 *    that could spend API credits).
 *  - APP_PASSWORD unset, locally   → open, for development.
 *
 * Tokens are `<expiresAtMs>.<HMAC-SHA256(expiresAtMs)>`, keyed by SESSION_SECRET (or, if unset,
 * derived from APP_PASSWORD so changing the password signs everyone out). Uses Web Crypto only.
 */
export const SESSION_COOKIE = "mlh_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthMode = "password" | "locked" | "open";

export function authMode(): AuthMode {
  if (process.env.APP_PASSWORD) return "password";
  return process.env.VERCEL ? "locked" : "open";
}

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64url");
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || `monsta-lead-hunter:${process.env.APP_PASSWORD ?? ""}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** Constant-time string comparison (on equal-length HMAC digests). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_TTL_MS);
  return `${exp}.${await hmac(exp)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(exp));
}

/** Compares HMACs of both values so timing doesn't reveal the password length or prefix. */
export async function checkPassword(candidate: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return safeEqual(await hmac(`pw:${candidate}`), await hmac(`pw:${expected}`));
}

/** For route handlers: true if the request may access the app. */
export async function isAuthorized(cookieValue: string | undefined): Promise<boolean> {
  const mode = authMode();
  if (mode === "open") return true;
  if (mode === "locked") return false;
  return verifySessionToken(cookieValue);
}
