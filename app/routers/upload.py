"""Image upload endpoint."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Image
from app.schemas import UploadResponse, success_response
from app.services.storage import get_storage_provider

router = APIRouter(prefix="/api/v1", tags=["Upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    """Upload a photo and return image_id."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpeg, png, webp, gif")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")

    storage = get_storage_provider()
    path = await storage.upload(contents, file.filename or "upload.bin", file.content_type)
    url = storage.get_url(path)

    image = Image(
        original_filename=file.filename,
        storage_path=path,
        storage_url=url,
        mime_type=file.content_type,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return success_response(data=UploadResponse(image_id=image.id, url=url))
