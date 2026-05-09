"""LLM provider abstraction layer."""

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


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI-compatible API provider (works with OpenAI,通义千问,智谱,DeepSeek, etc.)."""

    def __init__(self, api_key: str, base_url: str, text_model: str, image_model: str) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.text_model = text_model
        self.image_model = image_model
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

        import base64
        b64_image = base64.b64encode(image_data).decode("utf-8")
        # Determine mime type roughly
        mime = "image/jpeg"
        if image_data[:8] == b"\x89PNG\r\n\x1a\n":
            mime = "image/png"
        elif image_data[:3] == b"GIF":
            mime = "image/gif"
        elif image_data[:2] == b"BM":
            mime = "image/bmp"

        payload = {
            "model": kwargs.get("model", self.text_model),
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


class MockLLMProvider(LLMProvider):
    """Mock provider for development/testing without API keys."""

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        return "https://placehold.co/512x512?text=Mock+Generated+Image"

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
        )
    raise ValueError(f"Unknown LLM provider: {provider}")
