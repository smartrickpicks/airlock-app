import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ------------------------------------------------------------------ */
/*  Workspace resolution cache (module-level, 5-minute TTL)           */
/* ------------------------------------------------------------------ */

interface CachedWorkspace {
  workspaceId: string;
  accentColor: string;
  logoUrl: string | null;
  enabledModules: string[];
  expiresAt: number;
}

export const WORKSPACE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const WORKSPACE_CACHE_MAX_SIZE = 1000;
export const workspaceCache = new Map<string, CachedWorkspace>();

/** Evict expired entries; if still over max, drop oldest entries (FIFO). */
function evictExpiredEntries() {
  if (workspaceCache.size <= WORKSPACE_CACHE_MAX_SIZE) return;
  const now = Date.now();
  for (const [key, val] of workspaceCache) {
    if (val.expiresAt <= now) workspaceCache.delete(key);
  }
  // If still over limit after expiry sweep, drop oldest (Map iteration order = insertion order)
  if (workspaceCache.size > WORKSPACE_CACHE_MAX_SIZE) {
    const excess = workspaceCache.size - WORKSPACE_CACHE_MAX_SIZE;
    const keys = Array.from(workspaceCache.keys()).slice(0, excess);
    for (const key of keys) workspaceCache.delete(key);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Hostnames that belong to the Airlock platform itself (not tenants). */
export const DEV_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "airlock-app-production.up.railway.app",
]);
export const GATEWAY_HOSTNAME = "doyoulikedags.xyz";
export const APP_HOSTNAME = "brainbrigade.xyz";
export const DEMO_HOSTNAME = "demo.doyoulikedags.xyz";
export const DEMO_WORKSPACE_ID = "DEMO_WORKSPACE_ID";

/**
 * Resolve a custom domain to a workspace ID.
 * Returns the workspace ID on success, or null on failure (404 / error).
 *
 * 1. Checks the in-memory cache (5-minute TTL)
 * 2. Calls /api/v1/workspaces/resolve on cache miss
 * 3. Caches successful results
 */
export async function resolveWorkspace(
  domain: string,
): Promise<CachedWorkspace | null> {
  if (!domain || !domain.trim()) return null;

  // Check cache first
  const cached = workspaceCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/workspaces/resolve?domain=${encodeURIComponent(domain)}`,
    );

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      id?: string;
      workspace_id?: string;
      accent_color?: string;
      logo_url?: string | null;
      enabled_modules?: string[];
      ai_provider?: string;
      ai_tier?: string;
    };
    const workspaceId = data.workspace_id ?? data.id;
    if (!workspaceId) {
      return null;
    }

    // Evict stale/excess entries before adding
    evictExpiredEntries();

    // Cache the result
    const entry: CachedWorkspace = {
      workspaceId,
      accentColor: data.accent_color ?? "#6366f1",
      logoUrl: data.logo_url ?? null,
      enabledModules: data.enabled_modules ?? [],
      expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
    };
    workspaceCache.set(domain, entry);

    return entry;
  } catch {
    return null;
  }
}

/**
 * Extract just the hostname (no port) from the Host header.
 * Returns lowercase hostname, or "localhost" if the header is absent.
 */
export function extractHostname(host: string): string {
  if (!host) return "localhost";
  return host.split(":")[0].toLowerCase();
}

/**
 * Classify the hostname for routing purposes.
 * Returns one of: "dev" | "gateway" | "demo" | "custom"
 */
export type HostKind = "dev" | "gateway" | "app" | "demo" | "custom";

export function classifyHost(hostname: string): HostKind {
  if (DEV_HOSTNAMES.has(hostname)) return "dev";
  if (hostname === GATEWAY_HOSTNAME) return "gateway";
  if (hostname === APP_HOSTNAME) return "app";
  if (hostname === DEMO_HOSTNAME) return "demo";
  return "custom";
}

/* ------------------------------------------------------------------ */
/*  Auth constants                                                     */
/* ------------------------------------------------------------------ */

const PUBLIC_EXACT_PATHS = new Set(["/", "/login", "/landing", "/favicon.ico"]);

const PUBLIC_PREFIXES = ["/_next", "/api", "/onboarding"];

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

/** Headers that must only be set by middleware, never by external clients. */
const TRUSTED_HEADERS = [
  "x-workspace-id",
  "x-workspace-mode",
  "x-workspace-accent-color",
  "x-workspace-logo-url",
  "x-workspace-modules",
] as const;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ---------- Strip spoofable headers from inbound requests ---------- */

  const requestHeaders = new Headers(request.headers);
  for (const header of TRUSTED_HEADERS) {
    requestHeaders.delete(header);
  }

  /* ---------- Host-based workspace resolution ---------- */

  const rawHost = request.headers.get("host") ?? "localhost";
  const hostname = extractHostname(rawHost);
  const hostKind = classifyHost(hostname);

  let workspaceId: string | undefined;
  let workspaceMode: string | undefined;

  if (hostKind === "dev" || hostKind === "gateway" || hostKind === "app") {
    // Local development, gateway root, or app host — skip resolution, use default workspace
  } else if (hostKind === "demo") {
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

    workspaceId = resolved.workspaceId;

    // Propagate workspace config to frontend via headers
    requestHeaders.set("x-workspace-accent-color", resolved.accentColor);
    if (resolved.logoUrl) {
      requestHeaders.set("x-workspace-logo-url", resolved.logoUrl);
    }
    requestHeaders.set(
      "x-workspace-modules",
      resolved.enabledModules.join(","),
    );
  }

  /* ---------- Set trusted workspace headers on the forwarded request ---------- */

  if (workspaceId) {
    requestHeaders.set("x-workspace-id", workspaceId);
  }
  if (workspaceMode) {
    requestHeaders.set("x-workspace-mode", workspaceMode);
  }

  /* ---------- Auth: public paths / prefixes / static files ---------- */

  const createResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  // Allow exact public paths
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return createResponse();
  }

  // Allow public prefixes (_next assets, API routes)
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return createResponse();
  }

  // Allow static files (anything with a file extension)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return createResponse();
  }

  // Require auth for everything else
  const token = request.cookies.get("airlock_access_token");
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return createResponse();
}

export const config = {
  matcher: ["/:path*"],
};
