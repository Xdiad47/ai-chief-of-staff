from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Core ──────────────────────────────────────────────────────────────────
    PROJECT_ID: str = "ai-chief-of-staff-494407"
    REGION: str = "asia-south1"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Firebase / GCP ────────────────────────────────────────────────────────
    FIREBASE_PROJECT_ID: str = "ai-chief-of-staff-494407"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    # ── Google Cloud Storage ──────────────────────────────────────────────────
    GCS_BUCKET_NAME: str = "ai-chief-of-staff-policies"

    # ── Gmail ─────────────────────────────────────────────────────────────────
    GMAIL_SENDER_EMAIL: str = ""

    # ── Calendarific ──────────────────────────────────────────────────────────
    CALENDARIFIC_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
