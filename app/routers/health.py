"""Health check endpoint."""

from fastapi import APIRouter

from app.schemas import success_response

router = APIRouter(tags=["Health"])


@router.get("/api/health")
async def health_check() -> dict:
    """Service health check."""
    return success_response(data={"status": "ok", "service": "hair-multica-backend"})
