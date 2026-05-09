"""SQLAlchemy ORM models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    openid = Column(String(128), unique=True, nullable=False, index=True)
    nickname = Column(String(64), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Image(Base):
    __tablename__ = "images"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    original_filename = Column(String(256), nullable=True)
    storage_path = Column(String(512), nullable=False)
    storage_url = Column(String(512), nullable=False)
    mime_type = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FaceAnalysis(Base):
    __tablename__ = "face_analyses"

    id = Column(String(36), primary_key=True, default=_uuid)
    image_id = Column(String(36), nullable=False, index=True)
    face_shape = Column(String(32), nullable=True)  # oval, round, square, heart, long, diamond
    forehead_width = Column(Float, nullable=True)
    cheekbone_width = Column(Float, nullable=True)
    jawline_width = Column(Float, nullable=True)
    face_length = Column(Float, nullable=True)
    features = Column(Text, nullable=True)  # JSON string for extensible features
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Hairstyle(Base):
    __tablename__ = "hairstyles"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # male, female, unisex
    style = Column(String(64), nullable=True, index=True)  # straight, curly, braid, dye
    length = Column(String(32), nullable=True, index=True)  # short, medium, long
    scene = Column(String(32), nullable=True, index=True)  # daily, work, date, party
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(512), nullable=True)
    thumbnail_url = Column(String(512), nullable=True)
    tags = Column(Text, nullable=True)  # JSON array string
    face_type_suitability = Column(Text, nullable=True)  # JSON array string, e.g. ["oval", "round"]
    prompt_for_generation = Column(Text, nullable=True)  # English prompt for SDXL
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class GenerateResult(Base):
    __tablename__ = "generate_results"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    image_id = Column(String(36), nullable=False, index=True)
    hairstyle_id = Column(String(36), nullable=True, index=True)
    custom_prompt = Column(Text, nullable=True)
    result_image_url = Column(String(512), nullable=False)
    status = Column(String(32), default="success", nullable=False)  # pending, success, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AIComment(Base):
    __tablename__ = "ai_comments"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    image_id = Column(String(36), nullable=False, index=True)
    hairstyle_id = Column(String(36), nullable=True, index=True)
    hairstyle_info = Column(Text, nullable=True)
    personality = Column(String(32), nullable=True)  # warm_bestie, sassy_stylist, knowledge_blogger
    comment_text = Column(Text, nullable=False)
    scores = Column(Text, nullable=True)  # JSON string for six-dimension scores
    rating = Column(Integer, nullable=True)  # 1-10 overall rating
    highlights = Column(Text, nullable=True)  # JSON array string
    tip = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON array string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
