import { NextResponse, type NextRequest } from "next/server";
import { authMode, isAuthorized, SESSION_COOKIE } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  if (await isAuthorized(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    const locked = authMode() === "locked";
    return NextResponse.json(
      { error: locked ? "App is locked: set APP_PASSWORD." : "Not signed in." },
      { status: locked ? 503 : 401 },
    );
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page/endpoint and static assets.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
