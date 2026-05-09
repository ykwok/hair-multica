"""Face analysis endpoint."""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FaceAnalysis, Image
from app.schemas import FaceAnalysisOut, FaceAnalysisRequest, success_response
from app.services.llm import get_llm_provider
from app.services.storage import get_storage_provider

router = APIRouter(prefix="/api/v1", tags=["Face Analysis"])

ANALYSIS_PROMPT = (
    "请分析这张人脸照片，返回严格的 JSON 格式结果，包含以下字段：\n"
    "face_shape (脸型: oval/round/square/heart/long/diamond),\n"
    "forehead_width (额头宽度 cm), cheekbone_width (颧骨宽度 cm),\n"
    "jawline_width (下颌宽度 cm), face_length (脸长 cm),\n"
    "features (对象，包含其他五官特征)。\n"
    "只返回 JSON，不要其他文字。"
)


@router.post("/analyze-face")
async def analyze_face(
    request: FaceAnalysisRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Analyze face shape and features from uploaded image."""
    image = db.query(Image).filter(Image.id == request.image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Check if analysis already exists
    existing = db.query(FaceAnalysis).filter(FaceAnalysis.image_id == request.image_id).first()
    if existing:
        features = None
        if existing.features:
            try:
                features = json.loads(existing.features)
            except json.JSONDecodeError:
                features = None
        return success_response(data=FaceAnalysisOut(
            id=existing.id,
            image_id=existing.image_id,
            face_shape=existing.face_shape,
            forehead_width=existing.forehead_width,
            cheekbone_width=existing.cheekbone_width,
            jawline_width=existing.jawline_width,
            face_length=existing.face_length,
            features=features,
        ))

    storage = get_storage_provider()
    image_bytes = await storage.download(image.storage_path)

    llm = get_llm_provider()
    result_text = await llm.analyze_image(image_bytes, ANALYSIS_PROMPT)

    # Parse JSON result
    try:
        result = json.loads(result_text)
    except json.JSONDecodeError:
        # Fallback: try to extract JSON from markdown code block
        import re
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", result_text, re.DOTALL)
        if match:
            result = json.loads(match.group(1))
        else:
            result = {
                "face_shape": "unknown",
                "forehead_width": None,
                "cheekbone_width": None,
                "jawline_width": None,
                "face_length": None,
                "features": {"raw": result_text},
            }

    analysis = FaceAnalysis(
        image_id=request.image_id,
        face_shape=result.get("face_shape"),
        forehead_width=result.get("forehead_width"),
        cheekbone_width=result.get("cheekbone_width"),
        jawline_width=result.get("jawline_width"),
        face_length=result.get("face_length"),
        features=json.dumps(result.get("features", {}), ensure_ascii=False) if result.get("features") else None,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return success_response(data=FaceAnalysisOut(
        id=analysis.id,
        image_id=analysis.image_id,
        face_shape=analysis.face_shape,
        forehead_width=analysis.forehead_width,
        cheekbone_width=analysis.cheekbone_width,
        jawline_width=analysis.jawline_width,
        face_length=analysis.face_length,
        features=result.get("features"),
    ))
