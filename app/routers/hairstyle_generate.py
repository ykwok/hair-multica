"""AI hairstyle generation endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GenerateResult, Hairstyle, Image
from app.schemas import GenerateHairstyleRequest, GenerateResultOut, success_response
from app.services.llm import get_llm_provider
from app.services.storage import get_storage_provider

router = APIRouter(prefix="/api/v1", tags=["Hairstyle Generation"])


def _build_prompt(image_context: str, hairstyle_name: str | None, custom_prompt: str | None) -> str:
    base = "基于用户上传的照片，生成一张 AI 换发型后的效果图。"
    if hairstyle_name:
        base += f" 发型风格：{hairstyle_name}。"
    if custom_prompt:
        base += f" 用户额外要求：{custom_prompt}。"
    base += " 保持用户原有面部特征不变，只更换发型。"
    return base


@router.post("/generate-hairstyle")
async def generate_hairstyle(
    request: GenerateHairstyleRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Generate AI hairstyle transformation image."""
    image = db.query(Image).filter(Image.id == request.image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    hairstyle_name = None
    if request.hairstyle_id:
        hairstyle = db.query(Hairstyle).filter(Hairstyle.id == request.hairstyle_id).first()
        if hairstyle:
            hairstyle_name = hairstyle.name

    prompt = _build_prompt("用户照片", hairstyle_name, request.custom_prompt)

    llm = get_llm_provider()
    storage = get_storage_provider()

    try:
        # If we have image data, we could pass it for image-to-image,
        # but many providers don't support that yet, so we use text-to-image
        # with a detailed prompt. For providers that support it, we'd pass image_bytes.
        image_url = await llm.generate_image(prompt)
    except Exception as exc:
        result = GenerateResult(
            image_id=request.image_id,
            hairstyle_id=request.hairstyle_id,
            custom_prompt=request.custom_prompt,
            result_image_url="",
            status="failed",
            error_message=str(exc),
        )
        db.add(result)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Image generation failed: {exc}")

    result = GenerateResult(
        image_id=request.image_id,
        hairstyle_id=request.hairstyle_id,
        custom_prompt=request.custom_prompt,
        result_image_url=image_url,
        status="success",
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return success_response(data=GenerateResultOut.model_validate(result))
