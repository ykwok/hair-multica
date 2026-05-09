"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Any

import json

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ------------------------------
# Base response wrapper
# ------------------------------
class Meta(BaseModel):
    page: int | None = None
    per_page: int | None = None
    total: int | None = None


class APIResponse(BaseModel):
    success: bool = True
    data: Any | None = None
    meta: Meta | None = None
    error: dict[str, Any] | None = None


class APIError(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


def success_response(data: Any = None, meta: Meta | None = None) -> dict[str, Any]:
    return {"success": True, "data": data, "meta": meta, "error": None}


def error_response(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"success": False, "data": None, "meta": None, "error": {"code": code, "message": message, "details": details}}


# ------------------------------
# User schemas
# ------------------------------
class UserBase(BaseModel):
    openid: str
    nickname: str | None = None
    avatar_url: str | None = None


class UserCreate(UserBase):
    pass


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime


# ------------------------------
# Image schemas
# ------------------------------
class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    original_filename: str | None
    storage_url: str
    mime_type: str | None
    created_at: datetime


class UploadResponse(BaseModel):
    image_id: str
    url: str


# ------------------------------
# Face analysis schemas
# ------------------------------
class FaceAnalysisRequest(BaseModel):
    image_id: str


class FaceAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    image_id: str
    face_shape: str | None
    forehead_width: float | None
    cheekbone_width: float | None
    jawline_width: float | None
    face_length: float | None
    features: dict[str, Any] | None = None


# ------------------------------
# Hairstyle schemas
# ------------------------------
class HairstyleBase(BaseModel):
    name: str
    category: str
    style: str | None = None
    description: str | None = None
    cover_image_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    sort_order: int = 0

    @field_validator("tags", mode="before")
    @classmethod
    def _parse_tags(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v


class HairstyleCreate(HairstyleBase):
    pass


class HairstyleOut(HairstyleBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime


class HairstyleListResponse(BaseModel):
    items: list[HairstyleOut]
    total: int


# ------------------------------
# Generate hairstyle schemas
# ------------------------------
class GenerateHairstyleRequest(BaseModel):
    image_id: str
    hairstyle_id: str | None = None
    custom_prompt: str | None = None


class GenerateResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    image_id: str
    hairstyle_id: str | None
    custom_prompt: str | None
    result_image_url: str
    status: str
    created_at: datetime


# ------------------------------
# AI comment schemas
# ------------------------------
class AICommentRequest(BaseModel):
    image_id: str
    hairstyle_id: str | None = None
    hairstyle_info: str | None = None


class AICommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    image_id: str
    hairstyle_id: str | None
    comment_text: str
    rating: int | None
    tags: list[str] | None = None
    created_at: datetime
