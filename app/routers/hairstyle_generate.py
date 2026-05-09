"""AI hairstyle generation endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Hairstyle, Image
from app.schemas import GenerateHairstyleRequest, success_response
from app.services.storage import get_storage_provider
from app.services.task_manager import task_manager

router = APIRouter(prefix="/api/v1", tags=["Hairstyle Generation"])


@router.post("/generate-hairstyle")
async def generate_hairstyle(
    request: GenerateHairstyleRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Generate AI hairstyle transformation image (async)."""
    image = db.query(Image).filter(Image.id == request.image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    hairstyle_name = None
    if request.hairstyle_id:
        hairstyle = db.query(Hairstyle).filter(Hairstyle.id == request.hairstyle_id).first()
        if hairstyle:
            hairstyle_name = hairstyle.name

    storage = get_storage_provider()
    image_bytes = await storage.download(image.storage_path)

    # Create async task
    task_id = task_manager.create_task(
        task_type="generate",
        params={
            "image_id": request.image_id,
            "hairstyle_id": request.hairstyle_id,
            "hairstyle_name": hairstyle_name,
            "custom_prompt": request.custom_prompt,
            "mode": request.mode,
        },
    )

    # Start background processing
    task_manager.start_task(
        task_id,
        task_manager.run_generate_task(
            task_id=task_id,
            image_id=request.image_id,
            hairstyle_id=request.hairstyle_id,
            hairstyle_name=hairstyle_name,
            custom_prompt=request.custom_prompt,
            mode=request.mode,
            image_bytes=image_bytes,
        ),
    )

    return success_response(data={"task_id": task_id, "status": "pending"})
