"""Global error handling middleware."""

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.schemas import error_response


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and return uniform error format."""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Log the error in production
            # logger.exception("Unhandled exception")
            return JSONResponse(
                status_code=500,
                content=error_response(
                    code="INTERNAL_ERROR",
                    message="An internal server error occurred.",
                    details={"type": type(exc).__name__},
                ),
            )
