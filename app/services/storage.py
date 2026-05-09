"""Storage provider abstraction layer."""

import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from app.config import settings


class StorageProvider(ABC):
    """Abstract storage provider for file uploads/downloads."""

    @abstractmethod
    async def upload(self, file_data: bytes, filename: str, content_type: str | None = None) -> str:
        """Upload file and return storage path/identifier."""
        ...

    @abstractmethod
    async def download(self, path: str) -> bytes:
        """Download file by path/identifier."""
        ...

    @abstractmethod
    def get_url(self, path: str) -> str:
        """Get publicly accessible URL for the file."""
        ...


class LocalStorage(StorageProvider):
    """Local filesystem storage implementation."""

    def __init__(self, base_path: str, base_url: str) -> None:
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.base_url = base_url.rstrip("/")

    async def upload(self, file_data: bytes, filename: str, content_type: str | None = None) -> str:
        ext = Path(filename).suffix or ".bin"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        # Organize by date for easier management
        from datetime import datetime
        date_dir = datetime.now().strftime("%Y/%m/%d")
        target_dir = self.base_path / date_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / unique_name
        file_path.write_bytes(file_data)
        return str(file_path.relative_to(self.base_path))

    async def download(self, path: str) -> bytes:
        file_path = self.base_path / path
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        return file_path.read_bytes()

    def get_url(self, path: str) -> str:
        return f"{self.base_url}/{path}"


class S3Storage(StorageProvider):
    """S3-compatible object storage (placeholder for future implementation)."""

    def __init__(self, bucket: str, region: str, access_key: str, secret_key: str, endpoint: str | None = None) -> None:
        self.bucket = bucket
        self.region = region
        self.access_key = access_key
        self.secret_key = secret_key
        self.endpoint = endpoint

    async def upload(self, file_data: bytes, filename: str, content_type: str | None = None) -> str:
        raise NotImplementedError("S3Storage not yet implemented")

    async def download(self, path: str) -> bytes:
        raise NotImplementedError("S3Storage not yet implemented")

    def get_url(self, path: str) -> str:
        raise NotImplementedError("S3Storage not yet implemented")


def get_storage_provider() -> StorageProvider:
    """Factory function to get configured storage provider."""
    provider = settings.storage_provider.lower()
    if provider == "local":
        return LocalStorage(settings.storage_local_path, settings.storage_base_url)
    if provider == "s3":
        return S3Storage(
            bucket=os.getenv("S3_BUCKET", ""),
            region=os.getenv("S3_REGION", "us-east-1"),
            access_key=os.getenv("S3_ACCESS_KEY", ""),
            secret_key=os.getenv("S3_SECRET_KEY", ""),
            endpoint=os.getenv("S3_ENDPOINT", None),
        )
    raise ValueError(f"Unknown storage provider: {provider}")
