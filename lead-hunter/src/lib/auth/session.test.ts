import { afterEach, describe, expect, it, vi } from "vitest";
import { authMode, checkPassword, createSessionToken, verifySessionToken, isAuthorized, SESSION_TTL_MS } from "./session";

afterEach(() => vi.unstubAllEnvs());

describe("auth", () => {
  it("is open locally, locked on Vercel without a password, password-protected when set", () => {
    vi.stubEnv("APP_PASSWORD", "");
    vi.stubEnv("VERCEL", "");
    expect(authMode()).toBe("open");
    vi.stubEnv("VERCEL", "1");
    expect(authMode()).toBe("locked");
    vi.stubEnv("APP_PASSWORD", "hunter2");
    expect(authMode()).toBe("password");
  });

  it("checks the password", async () => {
    vi.stubEnv("APP_PASSWORD", "correct horse");
    expect(await checkPassword("correct horse")).toBe(true);
    expect(await checkPassword("wrong")).toBe(false);
  });

  it("issues tokens that verify, expire, and fail when tampered or after a password change", async () => {
    vi.stubEnv("APP_PASSWORD", "pw1");
    const t = await createSessionToken(1_000);
    expect(await verifySessionToken(t, 2_000)).toBe(true);
    expect(await verifySessionToken(t, 1_000 + SESSION_TTL_MS + 1)).toBe(false);
    const [exp, sig] = t.split(".");
    expect(await verifySessionToken(`${Number(exp) + 1}.${sig}`, 2_000)).toBe(false);
    expect(await verifySessionToken("garbage", 2_000)).toBe(false);
    vi.stubEnv("APP_PASSWORD", "pw2");
    expect(await verifySessionToken(t, 2_000)).toBe(false);
  });

  it("denies everything when locked", async () => {
    vi.stubEnv("APP_PASSWORD", "");
    vi.stubEnv("VERCEL", "1");
    expect(await isAuthorized(await createSessionToken())).toBe(false);
  });
});
