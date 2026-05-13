from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Added extra="ignore" to prevent crashes from unrecognized .env lines
    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=False, 
        extra="ignore"
    )

    APP_NAME: str = "Neolix Hub"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me"

    # MongoDB — profile, settings, logs
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "neolix"

    # Aiven PostgreSQL — leads (Module 2)
    AIVEN_DATABASE_URL: str = ""
    GROQAPI_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: str = "https://neolix-sage.vercel.app"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()