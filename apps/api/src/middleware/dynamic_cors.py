"""Dynamic CORS middleware — validates origins against workspace custom domains.

Replaces the static CORSMiddleware to support white-label custom domains.
Each request's Origin header is checked against:
  1. Static allowlist from settings.cors_origins (dev/gateway origins)
  2. Verified workspace custom_domain entries (via workspace_resolver cache)
"""

import logging
from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from src.config import settings
from src.services.workspace_resolver import _get_cached

logger = logging.getLogger(__name__)


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """CORS middleware that dynamically checks origins against workspace domains."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self._static_origins: set[str] = set(settings.cors_origins)
        # Merge extra origins from CORS_EXTRA_ORIGINS env var (comma-separated)
        if settings.cors_extra_origins:
            for extra in settings.cors_extra_origins.split(","):
                extra = extra.strip()
                if extra:
                    self._static_origins.add(extra)

    def _is_allowed_origin(self, origin: str) -> bool:
        """Check if origin is in static allowlist or matches a verified custom domain."""
        if origin in self._static_origins:
            return True

        # Extract hostname from origin (e.g., "https://app.example.com" -> "app.example.com")
        try:
            hostname = urlparse(origin).hostname
        except Exception:
            return False

        if not hostname:
            return False

        # Check if hostname matches a verified workspace custom_domain via cache
        cached = _get_cached(hostname)
        return cached is not None

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        """Process request and add CORS headers if origin is allowed."""
        origin = request.headers.get("origin")

        # Handle OPTIONS preflight
        if request.method == "OPTIONS" and origin:
            if self._is_allowed_origin(origin):
                # With Allow-Credentials:true, browsers take "*" LITERALLY for methods
                # and headers — so "*" fails to match POST / Content-Type and the whole
                # request is blocked. List methods explicitly and echo the client's
                # requested headers back so any needed header is allowed.
                req_headers = request.headers.get(
                    "access-control-request-headers", "Content-Type, Authorization"
                )
                return Response(
                    status_code=200,
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Credentials": "true",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                        "Access-Control-Allow-Headers": req_headers,
                        "Access-Control-Max-Age": "600",
                        "Vary": "Origin",
                    },
                )
            # No match — return 200 but without CORS headers (browser will block)
            return Response(status_code=200)

        # Normal request
        response = await call_next(request)

        if origin and self._is_allowed_origin(origin):
            # Actual (non-preflight) responses only need origin + credentials; the
            # Allow-Methods/Allow-Headers negotiation already happened in the preflight,
            # and a literal "*" here is invalid under credentialed CORS.
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"

        return response
