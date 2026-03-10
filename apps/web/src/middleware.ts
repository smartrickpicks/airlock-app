import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ------------------------------------------------------------------ */
/*  Workspace resolution cache (module-level, 5-minute TTL)           */
/* ------------------------------------------------------------------ */

interface CachedWorkspace {
  workspaceId: string;
  expiresAt: number;
}

const WORKSPACE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const workspaceCache = new Map<string, CachedWorkspace>();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const GATEWAY_HOSTNAME = "doyoulikedags.xyz";
const DEMO_HOSTNAME = "demo.doyoulikedags.xyz";
const DEMO_WORKSPACE_ID = "DEMO_WORKSPACE_ID";

/**
 * Resolve a custom domain to a workspace ID.
 * Returns the workspace ID on success, or null on failure (404 / error).
 */
async function resolveWorkspace(domain: string): Promise<string | null> {
  // Check cache first
  const cached = workspaceCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.workspaceId;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/workspaces/resolve?domain=${encodeURIComponent(domain)}`,
    );

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { id?: string; workspace_id?: string };
    const workspaceId = data.workspace_id ?? data.id;
    if (!workspaceId) {
      return null;
    }

    // Cache the result
    workspaceCache.set(domain, {
      workspaceId,
      expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
    });

    return workspaceId;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Auth constants                                                     */
/* ------------------------------------------------------------------ */

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/login",
  "/onboarding",
  "/favicon.ico",
]);

const PUBLIC_PREFIXES = ["/_next", "/api"];

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ---------- Host-based workspace resolution ---------- */

  const host = request.headers.get("host") ?? "localhost";
  const hostname = host.split(":")[0]; // strip port for local dev

  let workspaceId: string | undefined;
  let workspaceMode: string | undefined;

  if (DEV_HOSTNAMES.has(hostname)) {
    // Local development — skip resolution, use default workspace
  } else if (hostname === GATEWAY_HOSTNAME) {
    // Gateway root — has its own routing, skip resolution
  } else if (hostname === DEMO_HOSTNAME) {
    // Demo subdomain — hardcoded demo workspace
    workspaceId = DEMO_WORKSPACE_ID;
    workspaceMode = "demo";
  } else {
    // Custom domain — resolve via API
    const resolved = await resolveWorkspace(hostname);

    if (!resolved) {
      // Unknown domain — redirect to gateway
      return NextResponse.redirect(new URL(`https://${GATEWAY_HOSTNAME}`));
    }

    workspaceId = resolved;
  }

  /* ---------- Auth: public paths / prefixes / static files ---------- */

  // Allow exact public paths
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return withWorkspaceHeaders(
      NextResponse.next(),
      workspaceId,
      workspaceMode,
    );
  }

  // Allow public prefixes (_next assets, API routes)
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return withWorkspaceHeaders(
      NextResponse.next(),
      workspaceId,
      workspaceMode,
    );
  }

  // Allow static files (anything with a file extension)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return withWorkspaceHeaders(
      NextResponse.next(),
      workspaceId,
      workspaceMode,
    );
  }

  // Require auth for everything else
  const token = request.cookies.get("airlock_access_token");
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return withWorkspaceHeaders(NextResponse.next(), workspaceId, workspaceMode);
}

/**
 * Attach workspace headers to a NextResponse when available.
 */
function withWorkspaceHeaders(
  response: NextResponse,
  workspaceId?: string,
  workspaceMode?: string,
): NextResponse {
  if (workspaceId) {
    response.headers.set("x-workspace-id", workspaceId);
  }
  if (workspaceMode) {
    response.headers.set("x-workspace-mode", workspaceMode);
  }
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
