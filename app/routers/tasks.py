"""Task status endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GenerationTask, GenerateResult
from app.schemas import GenerateResultOut, TaskStatusOut, success_response

router = APIRouter(prefix="/api/v1", tags=["Tasks"])


@router.get("/tasks/{task_id}")
async def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Get async task status and result."""
    task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    response_data = {
        "task_id": task.id,
        "task_type": task.task_type,
        "status": task.status,
        "result_url": task.result_url,
        "error_message": task.error_message,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }

    # If task succeeded and has a result_id, include the full GenerateResult
    if task.status == "success" and task.result_id:
        result = db.query(GenerateResult).filter(GenerateResult.id == task.result_id).first()
        if result:
            response_data["result"] = GenerateResultOut.model_validate(result)

    return success_response(data=response_data)
