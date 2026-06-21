from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:3000"
    DATABASE_URL: str = "sqlite:///./kronos.db"
    SECRET_KEY: str = "kronos-dev-secret-change-in-prod"
    SPITCH_API_KEY: str = ""
    SPITCH_API_URL: str = "https://api.spitch.live/v1/speech:recognize"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
