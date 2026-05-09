"""LLM provider abstraction layer."""

import base64
import json
import os
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.config import settings


class LLMProvider(ABC):
    """Abstract LLM provider for image and text generation."""

    @abstractmethod
    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        """Generate image and return URL or base64 string."""
        ...

    @abstractmethod
    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        """Generate text and return the generated string."""
        ...

    @abstractmethod
    async def analyze_image(self, image_data: bytes, prompt: str, **kwargs: Any) -> str:
        """Analyze image with a text prompt and return structured result."""
        ...

    @abstractmethod
    async def generate_text_with_images(
        self, prompt: str, images: list[bytes | str], **kwargs: Any
    ) -> str:
        """Generate text using multimodal input (text + images).

        Args:
            prompt: Text prompt.
            images: List of image data (bytes for base64, or str for URLs).
            **kwargs: Additional provider-specific parameters.
        Returns:
            Generated text string.
        """
        ...


def _detect_mime(image_data: bytes) -> str:
    if image_data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    elif image_data[:3] == b"GIF":
        return "image/gif"
    elif image_data[:2] == b"BM":
        return "image/bmp"
    return "image/jpeg"


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI-compatible API provider (works with OpenAI,通义千问,智谱,DeepSeek, etc.)."""

    def __init__(self, api_key: str, base_url: str, text_model: str, image_model: str, vision_model: str | None = None) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.text_model = text_model
        self.image_model = image_model
        self.vision_model = vision_model or text_model
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        """Generate image using DALL-E style API."""
        if not self.api_key:
            # Return a mock URL when no API key is configured
            return "https://placehold.co/512x512?text=Mock+Generated+Image"

        payload = {
            "model": self.image_model,
            "prompt": prompt,
            "n": 1,
            "size": kwargs.get("size", "1024x1024"),
            "response_format": "url",
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/images/generations",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["url"]

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        """Generate text using chat completions API."""
        if not self.api_key:
            return "[Mock] 这是一个模拟的 AI 点评内容。当前未配置 LLM API Key。"

        payload = {
            "model": kwargs.get("model", self.text_model),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2048),
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def analyze_image(self, image_data: bytes, prompt: str, **kwargs: Any) -> str:
        """Analyze image using vision-capable model."""
        if not self.api_key:
            # Return mock analysis when no API key is configured
            return json.dumps({
                "face_shape": "oval",
                "forehead_width": 14.2,
                "cheekbone_width": 13.8,
                "jawline_width": 11.5,
                "face_length": 19.0,
                "features": {"skin_tone": "medium", "eye_shape": "almond"},
            })

        b64_image = self._encode_image(image_data)
        mime = _detect_mime(image_data)

        payload = {
            "model": kwargs.get("model", self.vision_model),
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_image}"}},
                    ],
                }
            ],
            "max_tokens": kwargs.get("max_tokens", 2048),
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def generate_text_with_images(
        self, prompt: str, images: list[bytes | str], **kwargs: Any
    ) -> str:
        """Generate text with multimodal images using OpenAI Vision API."""
        if not self.api_key:
            return "[Mock] 多模态点评（未配置 API Key）。"

        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for img in images:
            if isinstance(img, str):
                # URL
                content.append({"type": "image_url", "image_url": {"url": img}})
            else:
                b64 = self._encode_image(img)
                mime = _detect_mime(img)
                content.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}})

        payload = {
            "model": kwargs.get("model", self.vision_model),
            "messages": [{"role": "user", "content": content}],
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2048),
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    @staticmethod
    def _encode_image(image_data: bytes) -> str:
        return base64.b64encode(image_data).decode("utf-8")


class FalAIProvider(LLMProvider):
    """fal.ai provider for SDXL + InstantID high-quality image generation."""

    BASE_URL = "https://queue.fal.run"
    POLL_INTERVAL = 2.0

    def __init__(self, api_key: str, model_id: str, preview_model_id: str, timeout: int = 120) -> None:
        self.api_key = api_key
        self.model_id = model_id
        self.preview_model_id = preview_model_id
        self.timeout = timeout
        self.headers = {
            "Authorization": f"Key {api_key}",
            "Content-Type": "application/json",
        }

    def _detect_mime(self, image_data: bytes) -> str:
        if image_data[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"
        elif image_data[:3] == b"GIF":
            return "image/gif"
        elif image_data[:2] == b"BM":
            return "image/bmp"
        return "image/jpeg"

    async def _submit(self, model_path: str, payload: dict[str, Any]) -> str:
        """Submit a job to fal.ai queue and return request_id."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/{model_path}",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data.get("request_id", data.get("id")))

    async def _poll(self, model_path: str, request_id: str) -> dict[str, Any]:
        """Poll fal.ai queue until the job completes or times out."""
        import asyncio

        status_url = f"{self.BASE_URL}/{model_path}/requests/{request_id}/status"
        result_url = f"{self.BASE_URL}/{model_path}/requests/{request_id}"

        elapsed = 0.0
        async with httpx.AsyncClient() as client:
            while elapsed < self.timeout:
                # Check status
                resp = await client.get(status_url, headers=self.headers)
                resp.raise_for_status()
                status_data = resp.json()
                status = status_data.get("status", "UNKNOWN")

                if status == "COMPLETED":
                    result_resp = await client.get(result_url, headers=self.headers)
                    result_resp.raise_for_status()
                    return result_resp.json()

                if status in ("FAILED", "ERROR"):
                    error_msg = status_data.get("error", "Unknown error")
                    raise RuntimeError(f"fal.ai job failed: {error_msg}")

                await asyncio.sleep(self.POLL_INTERVAL)
                elapsed += self.POLL_INTERVAL

        raise TimeoutError(f"fal.ai job timed out after {self.timeout}s")

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        """Generate image using fal.ai SDXL + InstantID."""
        if not self.api_key:
            return "https://placehold.co/512x512?text=Mock+FalAI+Image"

        mode = kwargs.get("mode", "hd")
        model_path = self.preview_model_id if mode == "preview" else self.model_id

        payload: dict[str, Any] = {"prompt": prompt}

        if image_data is not None:
            # For InstantID / image-to-image workflows, pass the source image as base64
            b64_image = base64.b64encode(image_data).decode("utf-8")
            mime = self._detect_mime(image_data)
            payload["image"] = f"data:{mime};base64,{b64_image}"
            # Additional InstantID-specific params
            payload["identity_weight"] = kwargs.get("identity_weight", 0.8)
            payload["prompt"] = prompt

        # Some fal.ai models accept negative_prompt and other params
        if "negative_prompt" in kwargs:
            payload["negative_prompt"] = kwargs["negative_prompt"]
        if "seed" in kwargs:
            payload["seed"] = kwargs["seed"]
        if "num_inference_steps" in kwargs:
            payload["num_inference_steps"] = kwargs["num_inference_steps"]

        request_id = await self._submit(model_path, payload)
        result = await self._poll(model_path, request_id)

        # fal.ai result typically has `images` list with URLs or base64
        images = result.get("images", result.get("image", result.get("output", [])))
        if isinstance(images, dict):
            images = [images]
        if not images:
            raise ValueError("No images returned from fal.ai")

        first = images[0]
        if isinstance(first, dict):
            url = first.get("url", first.get("image_url"))
            if url:
                return url
            # Some models return base64
            b64 = first.get("content", first.get("base64"))
            if b64:
                return f"data:image/png;base64,{b64}"
        elif isinstance(first, str):
            if first.startswith("http"):
                return first
            return f"data:image/png;base64,{first}"

        raise ValueError(f"Unexpected fal.ai result format: {result}")

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        """fal.ai is primarily for image generation; delegate to mock for text."""
        return "[Mock] fal.ai does not support text generation. Use OpenAICompatibleProvider instead."

    async def analyze_image(self, image_data: bytes, prompt: str, **kwargs: Any) -> str:
        """fal.ai does not support vision analysis; delegate to mock."""
        return json.dumps({
            "face_shape": "oval",
            "forehead_width": 14.2,
            "cheekbone_width": 13.8,
            "jawline_width": 11.5,
            "face_length": 19.0,
            "features": {"skin_tone": "medium", "eye_shape": "almond"},
        })

    async def generate_text_with_images(
        self, prompt: str, images: list[bytes | str], **kwargs: Any
    ) -> str:
        """fal.ai does not support multimodal text generation; delegate to mock."""
        return "[Mock] fal.ai does not support multimodal text generation. Use OpenAICompatibleProvider or DashScopeProvider instead."


class AliyunProvider(OpenAICompatibleProvider):
    """Aliyun (通义万相 / 通义千问) provider using OpenAI-compatible API."""

    def __init__(self, api_key: str, base_url: str, text_model: str, image_model: str) -> None:
        super().__init__(api_key=api_key, base_url=base_url, text_model=text_model, image_model=image_model)

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        """Generate image using 通义万相 API."""
        if not self.api_key:
            return "https://placehold.co/512x512?text=Mock+Aliyun+Image"

        # 通义万相 uses a task-based async API, but for MVP we use the synchronous compatible endpoint
        # If image_data is provided, some aliyun models support image-to-image
        payload = {
            "model": self.image_model,
            "prompt": prompt,
        }
        if image_data is not None:
            b64_image = base64.b64encode(image_data).decode("utf-8")
            payload["input"] = {"image": f"data:image/jpeg;base64,{b64_image}"}

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/images/generations",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["output"]["results"][0]["url"]


class VolcEngineProvider(OpenAICompatibleProvider):
    """VolcEngine (豆包) provider using OpenAI-compatible API."""

    def __init__(self, api_key: str, base_url: str, text_model: str, image_model: str) -> None:
        super().__init__(api_key=api_key, base_url=base_url, text_model=text_model, image_model=image_model)


class DashScopeProvider(LLMProvider):
    """DashScope API provider for Qwen2-VL and other Alibaba Cloud models."""

    def __init__(self, api_key: str, text_model: str = "qwen-vl-max", image_model: str = "wanx2.1-t2i-turbo") -> None:
        self.api_key = api_key
        self.text_model = text_model
        self.image_model = image_model
        self.base_url = "https://dashscope.aliyuncs.com/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        if not self.api_key:
            return "https://placehold.co/512x512?text=Mock+Generated+Image"

        payload = {
            "model": self.image_model,
            "input": {"prompt": prompt},
            "parameters": {
                "size": kwargs.get("size", "1024x1024"),
            },
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/text2image/image-synthesis",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            # DashScope async task; simplified sync-like handling for MVP
            if "output" in data and "results" in data["output"]:
                return data["output"]["results"][0]["url"]
            if "output" in data and "task_id" in data["output"]:
                return f"https://placehold.co/512x512?text=Task+{data['output']['task_id']}"
            return "https://placehold.co/512x512?text=No+Image"

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        if not self.api_key:
            return "[Mock] DashScope 模拟文本生成。"

        payload = {
            "model": kwargs.get("model", self.text_model),
            "input": {"messages": [{"role": "user", "content": prompt}]},
            "parameters": {
                "temperature": kwargs.get("temperature", 0.7),
                "max_tokens": kwargs.get("max_tokens", 2048),
            },
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/text-generation/generation",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["output"]["choices"][0]["message"]["content"]

    async def analyze_image(self, image_data: bytes, prompt: str, **kwargs: Any) -> str:
        if not self.api_key:
            return json.dumps({
                "face_shape": "oval",
                "forehead_width": 14.2,
                "cheekbone_width": 13.8,
                "jawline_width": 11.5,
                "face_length": 19.0,
                "features": {"skin_tone": "medium", "eye_shape": "almond"},
            })

        b64 = self._encode_image(image_data)
        mime = _detect_mime(image_data)
        content = [
            {"image": f"data:{mime};base64,{b64}"},
            {"text": prompt},
        ]
        payload = {
            "model": kwargs.get("model", self.text_model),
            "input": {"messages": [{"role": "user", "content": content}]},
            "parameters": {
                "max_tokens": kwargs.get("max_tokens", 2048),
            },
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/multimodal-generation/generation",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["output"]["choices"][0]["message"]["content"]

    async def generate_text_with_images(
        self, prompt: str, images: list[bytes | str], **kwargs: Any
    ) -> str:
        """Generate text with images using Qwen2-VL."""
        if not self.api_key:
            return "[Mock] DashScope 多模态点评。"

        content: list[dict[str, str]] = []
        for img in images:
            if isinstance(img, str):
                content.append({"image": img})
            else:
                b64 = self._encode_image(img)
                mime = _detect_mime(img)
                content.append({"image": f"data:{mime};base64,{b64}"})
        content.append({"text": prompt})

        payload = {
            "model": kwargs.get("model", self.text_model),
            "input": {"messages": [{"role": "user", "content": content}]},
            "parameters": {
                "temperature": kwargs.get("temperature", 0.7),
                "max_tokens": kwargs.get("max_tokens", 2048),
            },
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/multimodal-generation/generation",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["output"]["choices"][0]["message"]["content"]

    @staticmethod
    def _encode_image(image_data: bytes) -> str:
        return base64.b64encode(image_data).decode("utf-8")


class FalAIProvider(LLMProvider):
    """fal.ai provider for SDXL + InstantID high-quality image generation."""

    BASE_URL = "https://queue.fal.run"
    POLL_INTERVAL = 2.0

    def __init__(self, api_key: str, model_id: str, preview_model_id: str, timeout: int = 120) -> None:
        self.api_key = api_key
        self.model_id = model_id
        self.preview_model_id = preview_model_id
        self.timeout = timeout
        self.headers = {
            "Authorization": f"Key {api_key}",
            "Content-Type": "application/json",
        }

    def _detect_mime(self, image_data: bytes) -> str:
        if image_data[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"
        elif image_data[:3] == b"GIF":
            return "image/gif"
        elif image_data[:2] == b"BM":
            return "image/bmp"
        return "image/jpeg"

    async def _submit(self, model_path: str, payload: dict[str, Any]) -> str:
        """Submit a job to fal.ai queue and return request_id."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/{model_path}",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data.get("request_id", data.get("id")))

    async def _poll(self, model_path: str, request_id: str) -> dict[str, Any]:
        """Poll fal.ai queue until the job completes or times out."""
        import asyncio

        status_url = f"{self.BASE_URL}/{model_path}/requests/{request_id}/status"
        result_url = f"{self.BASE_URL}/{model_path}/requests/{request_id}"

        elapsed = 0.0
        async with httpx.AsyncClient() as client:
            while elapsed < self.timeout:
                # Check status
                resp = await client.get(status_url, headers=self.headers)
                resp.raise_for_status()
                status_data = resp.json()
                status = status_data.get("status", "UNKNOWN")

                if status == "COMPLETED":
                    result_resp = await client.get(result_url, headers=self.headers)
                    result_resp.raise_for_status()
                    return result_resp.json()

                if status in ("FAILED", "ERROR"):
                    error_msg = status_data.get("error", "Unknown error")
                    raise RuntimeError(f"fal.ai job failed: {error_msg}")

                await asyncio.sleep(self.POLL_INTERVAL)
                elapsed += self.POLL_INTERVAL

        raise TimeoutError(f"fal.ai job timed out after {self.timeout}s")

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        """Generate image using fal.ai SDXL + InstantID."""
        if not self.api_key:
            return "https://placehold.co/512x512?text=Mock+FalAI+Image"

        mode = kwargs.get("mode", "hd")
        model_path = self.preview_model_id if mode == "preview" else self.model_id

        payload: dict[str, Any] = {"prompt": prompt}

        if image_data is not None:
            # For InstantID / image-to-image workflows, pass the source image as base64
            b64_image = base64.b64encode(image_data).decode("utf-8")
            mime = self._detect_mime(image_data)
            payload["image"] = f"data:{mime};base64,{b64_image}"
            # Additional InstantID-specific params
            payload["identity_weight"] = kwargs.get("identity_weight", 0.8)
            payload["prompt"] = prompt

        # Some fal.ai models accept negative_prompt and other params
        if "negative_prompt" in kwargs:
            payload["negative_prompt"] = kwargs["negative_prompt"]
        if "seed" in kwargs:
            payload["seed"] = kwargs["seed"]
        if "num_inference_steps" in kwargs:
            payload["num_inference_steps"] = kwargs["num_inference_steps"]

        request_id = await self._submit(model_path, payload)
        result = await self._poll(model_path, request_id)

        # fal.ai result typically has `images` list with URLs or base64
        images = result.get("images", result.get("image", result.get("output", [])))
        if isinstance(images, dict):
            images = [images]
        if not images:
            raise ValueError("No images returned from fal.ai")

        first = images[0]
        if isinstance(first, dict):
            url = first.get("url", first.get("image_url"))
            if url:
                return url
            # Some models return base64
            b64 = first.get("content", first.get("base64"))
            if b64:
                return f"data:image/png;base64,{b64}"
        elif isinstance(first, str):
            if first.startswith("http"):
                return first
            return f"data:image/png;base64,{first}"

        raise ValueError(f"Unexpected fal.ai result format: {result}")

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        """fal.ai is primarily for image generation; delegate to mock for text."""
        return "[Mock] fal.ai does not support text generation. Use OpenAICompatibleProvider instead."

    async def analyze_image(self, image_data: bytes, prompt: str, **kwargs: Any) -> str:
        """fal.ai does not support vision analysis; delegate to mock."""
        return json.dumps({
            "face_shape": "oval",
            "forehead_width": 14.2,
            "cheekbone_width": 13.8,
            "jawline_width": 11.5,
            "face_length": 19.0,
            "features": {"skin_tone": "medium", "eye_shape": "almond"},
        })


class AliyunProvider(OpenAICompatibleProvider):
    """Aliyun (通义万相 / 通义千问) provider using OpenAI-compatible API."""

    def __init__(self, api_key: str, base_url: str, text_model: str, image_model: str) -> None:
        super().__init__(api_key=api_key, base_url=base_url, text_model=text_model, image_model=image_model)

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        """Generate image using 通义万相 API."""
        if not self.api_key:
            return "https://placehold.co/512x512?text=Mock+Aliyun+Image"

        # 通义万相 uses a task-based async API, but for MVP we use the synchronous compatible endpoint
        # If image_data is provided, some aliyun models support image-to-image
        payload = {
            "model": self.image_model,
            "prompt": prompt,
        }
        if image_data is not None:
            b64_image = base64.b64encode(image_data).decode("utf-8")
            payload["input"] = {"image": f"data:image/jpeg;base64,{b64_image}"}

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/images/generations",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["output"]["results"][0]["url"]


class VolcEngineProvider(OpenAICompatibleProvider):
    """VolcEngine (豆包) provider using OpenAI-compatible API."""

    def __init__(self, api_key: str, base_url: str, text_model: str, image_model: str) -> None:
        super().__init__(api_key=api_key, base_url=base_url, text_model=text_model, image_model=image_model)


class MockLLMProvider(LLMProvider):
    """Mock provider for development/testing without API keys."""

    # A tiny 1x1 transparent PNG as data URI
    _MOCK_IMAGE_DATA_URI = (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        return self._MOCK_IMAGE_DATA_URI

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        return "[Mock] 这是一个模拟的 AI 生成文本。当前使用 MockLLMProvider。"

    async def analyze_image(self, image_data: bytes, prompt: str, **kwargs: Any) -> str:
        return json.dumps({
            "face_shape": "oval",
            "forehead_width": 14.2,
            "cheekbone_width": 13.8,
            "jawline_width": 11.5,
            "face_length": 19.0,
            "features": {"skin_tone": "medium", "eye_shape": "almond"},
        })

    async def generate_text_with_images(
        self, prompt: str, images: list[bytes | str], **kwargs: Any
    ) -> str:
        return json.dumps({
            "personality": "warm_bestie",
            "scores": {"face_match": 8, "hair_quality": 7, "style": 9, "emotion": 8, "knowledge": 7, "humor": 6},
            "comment": "[Mock] 亲爱的，这个发型真的超适合你！温柔又有气质，换了这个发型心情都会变好呢~ ✨",
            "highlights": ["超显脸小", "温柔感满满"],
            "tip": "记得用护发精油保持光泽感哦~",
        })


def get_llm_provider() -> LLMProvider:
    """Factory function to get configured LLM provider."""
    provider = settings.llm_provider.lower()
    if provider == "mock":
        return MockLLMProvider()

    if provider in ("openai", "openai_compatible"):
        return OpenAICompatibleProvider(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url or "https://api.openai.com/v1",
            text_model=settings.llm_text_model,
            image_model=settings.llm_image_model,
            vision_model=getattr(settings, "llm_vision_model", None) or settings.llm_text_model,
        )

    if provider == "falai":
        return FalAIProvider(
            api_key=settings.fal_api_key,
            model_id=settings.fal_model_id,
            preview_model_id=settings.fal_preview_model_id,
            timeout=settings.fal_timeout_seconds,
        )

    if provider == "aliyun":
        return AliyunProvider(
            api_key=settings.aliyun_api_key,
            base_url=settings.aliyun_base_url,
            text_model=settings.aliyun_text_model,
            image_model=settings.aliyun_image_model,
        )

    if provider == "volcengine":
        return VolcEngineProvider(
            api_key=settings.volcengine_api_key,
            base_url=settings.volcengine_base_url,
            text_model=settings.volcengine_text_model,
            image_model=settings.volcengine_image_model,
        )

    if provider == "dashscope":
        return DashScopeProvider(
            api_key=settings.llm_api_key,
            text_model=getattr(settings, "llm_text_model", "qwen-vl-max"),
            image_model=getattr(settings, "llm_image_model", "wanx2.1-t2i-turbo"),
        )

    raise ValueError(f"Unknown LLM provider: {provider}")
