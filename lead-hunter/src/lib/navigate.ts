/**
 * Full page load (not client-side routing). Used around sign-in/sign-out and session expiry
 * so the auth cookie, server components and in-memory stores all start fresh.
 */
export function hardNavigate(path: string) {
  window.location.href = path;
}

/** Send the user to sign in (no-op if already on the sign-in page, which would loop). */
export function goToLogin() {
  if (window.location.pathname === "/login") return;
  const next = window.location.pathname + window.location.search;
  hardNavigate(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
}
