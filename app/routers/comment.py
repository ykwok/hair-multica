"""AI comment endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AIComment, FaceAnalysis, Hairstyle, Image
from app.schemas import AICommentOut, AICommentRequest, success_response
from app.services.llm import get_llm_provider

router = APIRouter(prefix="/api/v1", tags=["AI Comment"])


def _build_comment_prompt(face_shape: str | None, hairstyle_name: str | None, hairstyle_info: str | None) -> str:
    base = "你是一位专业造型师，请根据用户脸型和发型给出点评建议。\n"
    if face_shape:
        base += f"用户脸型：{face_shape}。\n"
    if hairstyle_name:
        base += f"发型名称：{hairstyle_name}。\n"
    if hairstyle_info:
        base += f"发型信息：{hairstyle_info}。\n"
    base += (
        "请从以下维度给出点评（约200字）：\n"
        "1. 该发型与用户脸型的匹配度\n"
        "2. 优点与适合场合\n"
        "3. 可优化的建议\n"
        "语气亲切专业，适当使用 emoji。"
    )
    return base


@router.post("/ai-comment")
async def ai_comment(
    request: AICommentRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Generate AI stylist comment for the user's look."""
    image = db.query(Image).filter(Image.id == request.image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    face_analysis = db.query(FaceAnalysis).filter(FaceAnalysis.image_id == request.image_id).first()
    face_shape = face_analysis.face_shape if face_analysis else None

    hairstyle_name = None
    if request.hairstyle_id:
        hairstyle = db.query(Hairstyle).filter(Hairstyle.id == request.hairstyle_id).first()
        if hairstyle:
            hairstyle_name = hairstyle.name

    prompt = _build_comment_prompt(face_shape, hairstyle_name, request.hairstyle_info)

    llm = get_llm_provider()
    comment_text = await llm.generate_text(prompt)

    # Simple heuristic rating extraction
    rating = None
    import re
    match = re.search(r"(\d{1,2})\s*分", comment_text)
    if match:
        rating = int(match.group(1))
        if rating > 10:
            rating = 10

    comment = AIComment(
        image_id=request.image_id,
        hairstyle_id=request.hairstyle_id,
        hairstyle_info=request.hairstyle_info,
        comment_text=comment_text,
        rating=rating,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return success_response(data=AICommentOut.model_validate(comment))
