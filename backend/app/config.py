from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

    APP_NAME:   str = "Neolix Hub"
    APP_ENV:    str = "production"
    SECRET_KEY: str = "change-me"

    MONGODB_URL:     str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "neolix"

    AIVEN_DATABASE_URL: str = ""
    GROQAPI_KEY:        str = ""

    # Gmail API (replaces SMTP — works on HF Space, Render, everywhere)
    GMAIL_CLIENT_ID:     str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REFRESH_TOKEN: str = ""
    GMAIL_SENDER:        str = ""   # your gmail address

    # SMTP kept for reference only — not used when Gmail API is configured
    SMTP_HOST:     str = "smtp.gmail.com"
    SMTP_PORT:     int = 587
    SMTP_USER:     str = ""
    SMTP_PASSWORD: str = ""

    ALLOWED_ORIGINS: str = "https://neolix-sage.vercel.app,http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()