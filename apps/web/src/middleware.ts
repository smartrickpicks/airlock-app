import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/login",
  "/onboarding",
  "/favicon.ico",
]);

const PUBLIC_PREFIXES = ["/_next", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow exact public paths
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Allow public prefixes (_next assets, API routes)
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow static files (anything with a file extension)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Require auth for everything else
  const token = request.cookies.get("airlock_access_token");
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
