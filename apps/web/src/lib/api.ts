/**
 * API client configuration.
 * Uses generated types from @airlock/shared-types (OpenAPI codegen).
 */

export class ApiError extends Error {
  status: number;
  statusText: string;
  url: string;
  details: unknown;

  constructor(params: {
    status: number;
    statusText: string;
    url: string;
    details?: unknown;
    message: string;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.statusText = params.statusText;
    this.url = params.url;
    this.details = params.details;
  }
}

const API_BASE_URL = (() => {
  if (typeof window === "undefined") {
    // Server-side: always use the configured API URL for rewrites / SSR fetches
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }
  // Client-side: in production call the API directly (avoids rewrite proxy 502s).
  // In dev (localhost), use relative URLs so the Next.js rewrite proxies to the API.
  const configured = process.env.NEXT_PUBLIC_API_URL || "";
  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }
  return "";
})();

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("airlock_access_token");
}

/**
 * Base fetch wrapper with auth headers.
 * Replace with generated client from @airlock/shared-types when available.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let details: unknown;

    if (contentType.includes("application/json")) {
      try {
        details = await response.json();
      } catch {
        details = undefined;
      }
    } else {
      try {
        details = await response.text();
      } catch {
        details = undefined;
      }
    }

    const detailMessage =
      typeof details === "string"
        ? details
        : typeof details === "object" &&
            details &&
            "detail" in details &&
            typeof (details as { detail?: unknown }).detail === "string"
          ? (details as { detail: string }).detail
          : null;

    throw new ApiError({
      status: response.status,
      statusText: response.statusText,
      url,
      details,
      message: detailMessage
        ? `API error: ${response.status} ${response.statusText} - ${detailMessage}`
        : `API error: ${response.status} ${response.statusText} (${url})`,
    });
  }

  return response.json() as Promise<T>;
}
