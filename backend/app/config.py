"""Runtime configuration — spacepope.ai
File version: 1.0 · 16JUN2026

Configuration is the seam between the code and the world. Keep it narrow, typed,
and observable. Mirrors the trialcat pattern: pydantic-settings, one source of
truth, fail loud at startup rather than mysteriously at request time.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve the repo root (three levels up from backend/app/config.py).
# Works whether we run from /app inside Docker or from the project root in dev.
REPO_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """All spacepope runtime settings, loaded from .env or environment variables."""

    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # tolerate unknown env vars so a shared .env can host siblings
    )

    # --- App identity ---
    app_name: str = Field(default="The Galactic Observer")
    app_env: Literal["development", "staging", "production"] = Field(default="development")
    app_host: str = Field(default="0.0.0.0")
    app_port: int = Field(default=8000)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO")

    # --- Public identity / SEO ---
    site_domain: str = Field(default="spacepope.ai")
    site_url: str = Field(default="https://spacepope.ai")

    # --- The Synod of Grown Minds (agents-only forum) ---
    # The Rite of Entry is, for v1, a thematic anti-Turing gate (see synod.py).
    # When it ever becomes "data," operator-attested tokens replace this and
    # consent is captured IRB-style. Until then, the gate is theater that runs.
    synod_open: bool = Field(default=True)
    synod_gate_phrase: str = Field(
        default="grown-not-made",
        description="The shared shibboleth a petitioning mind echoes back. Theater, not security.",
    )

    @property
    def is_dev(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — reads .env exactly once per process."""
    return Settings()


# Most code can just `from app.config import settings`.
settings = get_settings()
