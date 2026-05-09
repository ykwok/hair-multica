"""Application configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "发型宇宙 API"
    app_version: str = "0.1.0"
    debug: bool = False

    # CORS
    cors_origins: list[str] = ["*"]

    # Database
    database_url: str = "sqlite:///./data/hair_multica.db"

    # Storage
    storage_provider: str = "local"  # local, s3
    storage_local_path: str = "./uploads"
    storage_base_url: str = "http://localhost:8000/uploads"

    # LLM
    llm_provider: str = "openai"  # openai, openai_compatible
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_image_model: str = "dall-e-3"
    llm_text_model: str = "gpt-4o"


settings = Settings()
