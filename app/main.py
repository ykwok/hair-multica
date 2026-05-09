"""FastAPI application entry point."""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.routers import comment, face, hairstyle, hairstyle_generate, health, upload


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="发型宇宙 - AI 换发型与造型点评后端服务",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
app.add_middleware(ErrorHandlerMiddleware)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    print(f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
    return response

# Static files for local uploads
app.mount("/uploads", StaticFiles(directory=settings.storage_local_path), name="uploads")

# Routers
app.include_router(health.router)
app.include_router(upload.router)
app.include_router(face.router)
app.include_router(hairstyle.router)
app.include_router(hairstyle_generate.router)
app.include_router(comment.router)


@app.get("/")
async def root() -> dict:
    return {"message": "发型宇宙 API", "version": settings.app_version, "docs": "/docs"}
