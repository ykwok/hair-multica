"""Pydantic schemas for request/response validation."""

import json
from datetime import datetime
from typing import Any

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
    length: str | None = None
    scene: str | None = None
    description: str | None = None
    cover_image_url: str | None = None
    thumbnail_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    face_type_suitability: list[str] = Field(default_factory=list)
    prompt_for_generation: str | None = None
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

    @field_validator("face_type_suitability", mode="before")
    @classmethod
    def _parse_face_type_suitability(cls, v):
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
    mode: str = "hd"  # preview, hd


class GenerateResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    image_id: str
    hairstyle_id: str | None
    custom_prompt: str | None
    result_image_url: str
    status: str
    created_at: datetime


class GenerateTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    task_id: str
    status: str  # pending, running, success, failed
    result: GenerateResultOut | None = None
    result_url: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


# ------------------------------
# Task schemas
# ------------------------------
class TaskStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    task_type: str
    status: str
    result_id: str | None = None
    result_url: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


# ------------------------------
# AI comment schemas
# ------------------------------
class Scores(BaseModel):
    face_match: int = Field(..., ge=1, le=10, description="脸型适配度")
    hair_quality: int = Field(..., ge=1, le=10, description="发质匹配度")
    style: int = Field(..., ge=1, le=10, description="风格气质匹配度")
    emotion: int = Field(..., ge=1, le=10, description="情绪价值")
    knowledge: int = Field(..., ge=1, le=10, description="专业冷知识")
    humor: int = Field(..., ge=1, le=10, description="幽默互动")


class AICommentRequest(BaseModel):
    image_id: str
    hairstyle_id: str | None = None
    hairstyle_info: str | None = None
    personality_type: str = Field(default="warm_bestie", description="warm_bestie | sassy_stylist | knowledge_blogger")


class AICommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    image_id: str
    hairstyle_id: str | None
    personality: str | None
    comment_text: str
    scores: dict[str, int] | None = None
    rating: int | None
    highlights: list[str] | None = None
    tip: str | None = None
    tags: list[str] | None = None
    created_at: datetime

    @field_validator("scores", mode="before")
    @classmethod
    def _parse_scores(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    @field_validator("highlights", mode="before")
    @classmethod
    def _parse_highlights(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    @field_validator("tags", mode="before")
    @classmethod
    def _parse_tags(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v
