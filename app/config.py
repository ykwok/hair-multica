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
    llm_provider: str = "openai"  # openai, openai_compatible, falai, aliyun, volcengine, mock
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_image_model: str = "dall-e-3"
    llm_text_model: str = "gpt-4o"

    # fal.ai
    fal_api_key: str = ""
    fal_model_id: str = "fal-ai/instant-id"  # fal.ai model path for SDXL+InstantID
    fal_preview_model_id: str = "fal-ai/fast-sdxl"  # fast preview model
    fal_timeout_seconds: int = 120

    # Aliyun (通义万相)
    aliyun_api_key: str = ""
    aliyun_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    aliyun_image_model: str = "wanx-v1"
    aliyun_text_model: str = "qwen-vl-max"

    # VolcEngine (豆包)
    volcengine_api_key: str = ""
    volcengine_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    volcengine_image_model: str = "doubao-image"
    volcengine_text_model: str = "doubao-vision-pro"


settings = Settings()
