
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "Recall API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30

    storage_dir: Path = ROOT_DIR / "backend" / "storage" / "documents"
    max_upload_size: int = 25 * 1024 * 1024

    # Local LLM
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"
    ollama_timeout: int = 120

    # Retrieval
    rag_top_k: int = 5
    rag_min_similarity: float = 0.25

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


if len(settings.secret_key) < 32:
    raise ValueError("SECRET_KEY must contain at least 32 characters.")
