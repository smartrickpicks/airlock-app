"""Search routes — workspace-scoped full-text search via MeiliSearch."""

from fastapi import APIRouter, Depends, Query

from src.middleware.auth import get_current_user
from src.services import search as search_service

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("")
async def search_all(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),  # noqa: B008
    module: str | None = Query(None, description="Filter by module type"),  # noqa: B008
    type: str | None = Query(None, description="Filter by result type (vault, document)"),  # noqa: B008
    limit: int = Query(20, ge=1, le=100, description="Max results"),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """
    Search across vaults and documents.

    Workspace isolation (RLS) is enforced automatically from the JWT —
    the workspace_id is never accepted from query parameters.
    """
    workspace_id = user["workspace_id"]
    return search_service.search(
        query=q,
        workspace_id=workspace_id,
        module_type=module,
        result_type=type,
        limit=limit,
    )
