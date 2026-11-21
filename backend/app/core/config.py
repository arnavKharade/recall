
from pathlib import Path
import re

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "Recall API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

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

    @field_validator("api_v1_prefix", mode="before")
    @classmethod
    def normalize_api_v1_prefix(cls, value: object) -> str:
        """Keep the API prefix a URL path, including under Git Bash on Windows."""
        if not isinstance(value, str):
            return "/api/v1"

        path = "/" + value.strip().replace("\\", "/").strip("/")
        if path == "/":
            return "/api/v1"

        # MSYS/Git Bash can rewrite a slash-prefixed environment value such as
        # /api/v1 into a Windows Git installation path before Python starts.
        # Filesystem paths, spaces, and other non-URL characters are never
        # valid API prefixes, so safely fall back to the application's route.
        if not re.fullmatch(r"/(?:[A-Za-z0-9_-]+)(?:/[A-Za-z0-9_-]+)*", path):
            return "/api/v1"

        return path

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()


if len(settings.secret_key) < 32:
    raise ValueError("SECRET_KEY must contain at least 32 characters.")
