"""Async task manager for long-running AI generation jobs."""

import asyncio
import base64
import json
import uuid
from collections.abc import Coroutine
from typing import Any

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import GenerateResult, GenerationTask
from app.services.llm import get_llm_provider
from app.services.storage import get_storage_provider


class TaskManager:
    """Simple in-memory async task manager using asyncio."""

    def __init__(self) -> None:
        self._running: set[asyncio.Task] = set()

    def _get_db(self) -> Session:
        return SessionLocal()

    def create_task(self, task_type: str, params: dict[str, Any]) -> str:
        """Create a pending task record in DB and return task_id."""
        db = self._get_db()
        try:
            task = GenerationTask(
                id=str(uuid.uuid4()),
                task_type=task_type,
                status="pending",
                params=json.dumps(params, ensure_ascii=False),
            )
            db.add(task)
            db.commit()
            return task.id
        finally:
            db.close()

    def start_task(self, task_id: str, coro: Coroutine[Any, Any, Any]) -> None:
        """Start a background task and keep a reference."""
        bg_task = asyncio.create_task(coro)
        self._running.add(bg_task)
        bg_task.add_done_callback(self._running.discard)

    async def run_generate_task(
        self,
        task_id: str,
        image_id: str,
        hairstyle_id: str | None,
        hairstyle_name: str | None,
        custom_prompt: str | None,
        mode: str,
        image_bytes: bytes,
    ) -> None:
        """Background coroutine that runs image generation and updates DB."""
        db = self._get_db()
        try:
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            if not task:
                return

            task.status = "running"
            db.commit()

            llm = get_llm_provider()
            storage = get_storage_provider()

            prompt = "基于用户上传的照片，生成一张 AI 换发型后的效果图。"
            if hairstyle_name:
                prompt += f" 发型风格：{hairstyle_name}。"
            if custom_prompt:
                prompt += f" 用户额外要求：{custom_prompt}。"
            prompt += " 保持用户原有面部特征不变，只更换发型。"

            try:
                image_url = await llm.generate_image(prompt, image_data=image_bytes, mode=mode)

                # Download generated image and store locally
                import httpx

                generated_bytes = b""
                if image_url.startswith("data:"):
                    # data URI
                    header, b64_data = image_url.split(",", 1)
                    generated_bytes = base64.b64decode(b64_data)
                else:
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        resp = await client.get(image_url)
                        resp.raise_for_status()
                        generated_bytes = resp.content

                storage_path = await storage.upload(
                    generated_bytes,
                    filename=f"generated_{task_id}.png",
                    content_type="image/png",
                )
                local_url = storage.get_url(storage_path)

                result = GenerateResult(
                    image_id=image_id,
                    hairstyle_id=hairstyle_id,
                    custom_prompt=custom_prompt,
                    result_image_url=local_url,
                    status="success",
                )
                db.add(result)
                db.commit()
                db.refresh(result)

                task.status = "success"
                task.result_id = result.id
                task.result_url = local_url
                db.commit()
            except Exception as exc:
                task.status = "failed"
                task.error_message = str(exc)
                db.commit()
        finally:
            db.close()


task_manager = TaskManager()
