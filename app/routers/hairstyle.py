"""Hairstyle endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Hairstyle
from app.schemas import HairstyleListResponse, HairstyleOut, success_response

router = APIRouter(prefix="/api/v1", tags=["Hairstyles"])

# Seed data for MVP
MOCK_HAIRSTYLES = [
    {
        "id": "hs-001",
        "name": "清爽短发",
        "category": "male",
        "style": "short",
        "description": "干净利落，适合职场与日常，凸显面部轮廓。",
        "cover_image_url": "https://placehold.co/300x400?text=Short+Hair",
        "tags": ["职场", "清爽", "易打理"],
        "sort_order": 1,
    },
    {
        "id": "hs-002",
        "name": "微卷中长发",
        "category": "female",
        "style": "medium",
        "description": "温柔浪漫，微卷增加发量感，适合约会和聚会。",
        "cover_image_url": "https://placehold.co/300x400?text=Medium+Wavy",
        "tags": ["浪漫", "温柔", "显发量"],
        "sort_order": 2,
    },
    {
        "id": "hs-003",
        "name": "韩式刘海长发",
        "category": "female",
        "style": "long",
        "description": "空气刘海搭配长直发，减龄又百搭。",
        "cover_image_url": "https://placehold.co/300x400?text=Long+Bang",
        "tags": ["减龄", "百搭", "甜美"],
        "sort_order": 3,
    },
    {
        "id": "hs-004",
        "name": "油头背头",
        "category": "male",
        "style": "short",
        "description": "经典商务造型，气场全开，适合正式场合。",
        "cover_image_url": "https://placehold.co/300x400?text=Slick+Back",
        "tags": ["商务", "气场", "正式"],
        "sort_order": 4,
    },
    {
        "id": "hs-005",
        "name": "羊毛卷",
        "category": "unisex",
        "style": "curly",
        "description": "蓬松羊毛卷，个性十足，适合潮流达人。",
        "cover_image_url": "https://placehold.co/300x400?text=Curly",
        "tags": ["潮流", "个性", "蓬松"],
        "sort_order": 5,
    },
    {
        "id": "hs-006",
        "name": "碎盖发型",
        "category": "male",
        "style": "short",
        "description": "层次感碎盖，修饰脸型，少年感满满。",
        "cover_image_url": "https://placehold.co/300x400?text=Layered",
        "tags": ["少年感", "修饰脸型", "层次"],
        "sort_order": 6,
    },
]


import json

def _ensure_seed_data(db: Session) -> None:
    """Ensure mock hairstyles exist in DB."""
    for item in MOCK_HAIRSTYLES:
        existing = db.query(Hairstyle).filter(Hairstyle.id == item["id"]).first()
        if not existing:
            row = dict(item)
            if isinstance(row.get("tags"), list):
                row["tags"] = json.dumps(row["tags"], ensure_ascii=False)
            db.add(Hairstyle(**row))
    db.commit()


@router.get("/hairstyles")
async def list_hairstyles(
    category: str | None = Query(None, description="Filter by category: male, female, unisex"),
    style: str | None = Query(None, description="Filter by style: short, medium, long, curly, straight"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    """List hairstyles with optional filtering."""
    _ensure_seed_data(db)

    query = db.query(Hairstyle)
    if category:
        query = query.filter(Hairstyle.category == category)
    if style:
        query = query.filter(Hairstyle.style == style)

    total = query.count()
    items = (
        query.order_by(Hairstyle.sort_order.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return success_response(
        data=HairstyleListResponse(
            items=[HairstyleOut.model_validate(item) for item in items],
            total=total,
        ),
        meta={"page": page, "per_page": per_page, "total": total},
    )
