"""GIF proxy service — Tenor API wrapper."""

import logging

import httpx

from src.config import settings

logger = logging.getLogger(__name__)

TENOR_BASE = "https://tenor.googleapis.com/v2"


async def search_gifs(query: str, limit: int = 20) -> list[dict]:
    """Search Tenor for GIFs matching a query."""
    if not settings.tenor_api_key:
        logger.warning("TENOR_API_KEY not set — returning empty results")
        return []

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{TENOR_BASE}/search",
            params={
                "key": settings.tenor_api_key,
                "q": query,
                "limit": min(limit, 50),
                "media_filter": "gif,tinygif",
                "contentfilter": "medium",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    return _format_results(data.get("results", []))


async def trending_gifs(limit: int = 20) -> list[dict]:
    """Get trending GIFs from Tenor."""
    if not settings.tenor_api_key:
        logger.warning("TENOR_API_KEY not set — returning empty results")
        return []

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{TENOR_BASE}/featured",
            params={
                "key": settings.tenor_api_key,
                "limit": min(limit, 50),
                "media_filter": "gif,tinygif",
                "contentfilter": "medium",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    return _format_results(data.get("results", []))


def _format_results(results: list[dict]) -> list[dict]:
    """Format Tenor API results to a simpler structure."""
    gifs = []
    for item in results:
        media_formats = item.get("media_formats", {})
        gif = media_formats.get("gif", {})
        tinygif = media_formats.get("tinygif", {})

        if not gif.get("url"):
            continue

        gifs.append(
            {
                "id": item.get("id", ""),
                "title": item.get("content_description", ""),
                "url": gif["url"],
                "width": gif.get("dims", [0, 0])[0],
                "height": gif.get("dims", [0, 0])[1],
                "previewUrl": tinygif.get("url", gif["url"]),
                "previewWidth": tinygif.get("dims", [0, 0])[0],
                "previewHeight": tinygif.get("dims", [0, 0])[1],
                "provider": "tenor",
            }
        )
    return gifs
