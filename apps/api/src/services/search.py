"""Search service — MeiliSearch integration with workspace-scoped RLS."""

import asyncio
import logging
import re
import threading
from typing import Any

import meilisearch

from src.config import settings

logger = logging.getLogger(__name__)

_client: meilisearch.Client | None = None
_client_lock = threading.Lock()

_ULID_RE = re.compile(r"^[0-9A-Za-z]{26}$")

INDEX_CONFIGS = {
    "vaults": {
        "searchableAttributes": ["name", "entity", "contract_type", "module_type"],
        "filterableAttributes": [
            "workspace_id",
            "module_type",
            "chamber",
            "vault_level",
            "archived",
        ],
        "sortableAttributes": ["created_at", "updated_at", "health_score"],
    },
    "documents": {
        "searchableAttributes": ["filename", "full_text", "document_type"],
        "filterableAttributes": ["workspace_id", "vault_id", "status", "file_format"],
        "sortableAttributes": ["created_at"],
    },
    "events": {
        "searchableAttributes": ["event_type", "actor_id"],
        "filterableAttributes": ["workspace_id", "vault_id", "event_type"],
        "sortableAttributes": ["created_at"],
    },
}


def _get_client() -> meilisearch.Client | None:
    """Get MeiliSearch client, or None if unavailable. Thread-safe."""
    global _client  # noqa: PLW0603
    if _client is not None:
        return _client
    with _client_lock:
        if _client is not None:
            return _client
        try:
            _client = meilisearch.Client(settings.meili_url, settings.meili_master_key)
            _client.health()
            logger.info("MeiliSearch connected at %s", settings.meili_url)
        except Exception:
            logger.warning("MeiliSearch unavailable — search will be disabled")
            _client = None
    return _client


def _ensure_indexes_sync() -> None:
    """Create indexes and configure settings (sync, run via to_thread)."""
    client = _get_client()
    if not client:
        return
    import contextlib

    for index_name, config in INDEX_CONFIGS.items():
        with contextlib.suppress(meilisearch.errors.MeilisearchApiError):
            client.create_index(index_name, {"primaryKey": "id"})
        index = client.index(index_name)
        index.update_searchable_attributes(config["searchableAttributes"])
        index.update_filterable_attributes(config["filterableAttributes"])
        index.update_sortable_attributes(config["sortableAttributes"])
    logger.info("MeiliSearch indexes configured")


async def ensure_indexes() -> None:
    """Create indexes and configure settings if they don't exist."""
    await asyncio.to_thread(_ensure_indexes_sync)


def _index_vault_sync(vault: dict) -> None:
    """Add or update a vault in the search index (sync, run via to_thread)."""
    client = _get_client()
    if not client:
        return
    doc = {
        "id": vault["id"],
        "name": vault.get("name", ""),
        "entity": vault.get("metadata", {}).get("entity", ""),
        "contract_type": vault.get("metadata", {}).get("contract_type", ""),
        "module_type": vault.get("module_type", ""),
        "chamber": vault.get("chamber", ""),
        "vault_level": vault.get("vault_level", 1),
        "workspace_id": vault["workspace_id"],
        "health_score": vault.get("health_score", 0),
        "archived": vault.get("archived_at") is not None,
        "created_at": vault.get("created_at", ""),
        "updated_at": vault.get("updated_at", ""),
    }
    try:
        client.index("vaults").add_documents([doc])
    except Exception:
        logger.warning("Failed to index vault %s", vault["id"])


async def index_vault(vault: dict) -> None:
    """Add or update a vault in the search index."""
    await asyncio.to_thread(_index_vault_sync, vault)


def _index_document_sync(document: dict) -> None:
    """Add or update a document in the search index (sync, run via to_thread)."""
    client = _get_client()
    if not client:
        return
    doc = {
        "id": document["id"],
        "filename": document.get("filename", ""),
        "full_text": (document.get("full_text", "") or "")[:10000],
        "document_type": document.get("document_type", ""),
        "workspace_id": document["workspace_id"],
        "vault_id": document.get("vault_id", ""),
        "status": document.get("status", ""),
        "file_format": document.get("file_format", ""),
        "created_at": document.get("created_at", ""),
    }
    try:
        client.index("documents").add_documents([doc])
    except Exception:
        logger.warning("Failed to index document %s", document["id"])


async def index_document(document: dict) -> None:
    """Add or update a document in the search index."""
    await asyncio.to_thread(_index_document_sync, document)


def _search_sync(
    query: str,
    workspace_id: str,
    module_type: str | None = None,
    result_type: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    """Sync search implementation (run via to_thread)."""
    client = _get_client()
    if not client:
        return {"results": [], "total": 0, "processingTimeMs": 0}

    # Validate module_type against allowlist to prevent filter injection
    valid_modules = {"contracts", "crm", "triage", "calendar", "documents"}
    if module_type and module_type not in valid_modules:
        module_type = None

    # Determine which indexes to search
    indexes_to_search = []
    if result_type in (None, "vault"):
        indexes_to_search.append("vaults")
    if result_type in (None, "document"):
        indexes_to_search.append("documents")

    results: list[dict] = []
    total_time = 0

    for index_name in indexes_to_search:
        # Build mandatory workspace filter (RLS) — validate ULID format
        if not _ULID_RE.match(workspace_id):
            return {"results": [], "total": 0, "processingTimeMs": 0}
        filters = [f"workspace_id = '{workspace_id}'"]
        if index_name == "vaults":
            filters.append("archived = false")
            if module_type:
                filters.append(f"module_type = '{module_type}'")

        filter_str = " AND ".join(filters)

        try:
            search_result = client.index(index_name).search(
                query,
                {
                    "filter": filter_str,
                    "limit": limit,
                    "attributesToHighlight": ["name", "filename", "entity"],
                    "highlightPreTag": "<mark>",
                    "highlightPostTag": "</mark>",
                },
            )
            total_time += search_result.get("processingTimeMs", 0)

            for hit in search_result.get("hits", []):
                result_item: dict[str, Any] = {
                    "id": hit["id"],
                    "type": "vault" if index_name == "vaults" else "document",
                    "module": hit.get("module_type", ""),
                    "score": 1.0,
                }
                if index_name == "vaults":
                    result_item["title"] = hit.get("name", "")
                    result_item["subtitle"] = (
                        f"{hit.get('entity', '')} — {hit.get('contract_type', '')}"
                    )
                    result_item["href"] = f"/{hit.get('module_type', 'contracts')}/{hit['id']}"
                else:
                    result_item["title"] = hit.get("filename", "")
                    result_item["subtitle"] = hit.get("document_type", "")
                    result_item["href"] = f"/documents/{hit['id']}"

                highlights = hit.get("_formatted", {})
                result_item["highlights"] = {
                    k: v
                    for k, v in highlights.items()
                    if k in ("name", "filename", "entity") and "<mark>" in str(v)
                }
                results.append(result_item)

        except Exception:
            logger.warning("Search failed on index %s", index_name)

    return {
        "results": results[:limit],
        "total": len(results),
        "processingTimeMs": total_time,
    }


async def search(
    query: str,
    workspace_id: str,
    module_type: str | None = None,
    result_type: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    """
    Search across indexes with mandatory workspace_id filtering (RLS).

    workspace_id is ALWAYS enforced — it comes from the JWT, never from user input.
    """
    return await asyncio.to_thread(
        _search_sync, query, workspace_id, module_type, result_type, limit
    )


def _reindex_all_sync(workspace_id: str, vaults: list[dict], documents: list[dict]) -> int:
    """Reindex all records for a workspace (sync, run via to_thread)."""
    count = 0
    for vault in vaults:
        if vault.get("workspace_id") == workspace_id:
            _index_vault_sync(vault)
            count += 1
    for doc in documents:
        if doc.get("workspace_id") == workspace_id:
            _index_document_sync(doc)
            count += 1
    return count


async def reindex_all(workspace_id: str, vaults: list[dict], documents: list[dict]) -> int:
    """Reindex all records for a workspace. Returns count of indexed items."""
    return await asyncio.to_thread(_reindex_all_sync, workspace_id, vaults, documents)
