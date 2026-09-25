import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    APP_NAME: str = "NyayRaksha — Secure Digital Document Management System"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Database
    # Default to SQLite for zero-dependency local execution
    DATABASE_URL: str = "sqlite+aiosqlite:///./nyayraksha.db"
    DATABASE_ECHO: bool = False

    # Redis (Optional in local dev)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & JWT
    JWT_SECRET: str = "nyayraksha_super_secret_jwt_key_sih_2026_production_min_32_chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TTL_MINUTES: int = 15
    JWT_REFRESH_TTL_DAYS: int = 7
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return []

    # Storage (local AES-256 or s3)
    STORAGE_MODE: str = "local"  # "local" or "s3"
    STORAGE_LOCAL_DIR: str = "./storage_vault"
    STORAGE_ENCRYPTION_ENABLED: bool = True
    STORAGE_AES_KEY: str = "NyayRakshaStorageMasterKey2026!32"  # 32 bytes for AES-256

    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_BUCKET: str = "nyayraksha-private"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "ap-south-1"
    S3_PRESIGNED_URL_TTL_SECONDS: int = 300

    # Virus Scanner
    SCANNER_MODE: str = "local"  # "local" or "clamav"
    CLAMAV_HOST: str = "localhost"
    CLAMAV_PORT: int = 3310

    # Permissioned Blockchain
    BLOCKCHAIN_MODE: str = "mock"  # "mock" or "fabric"
    FABRIC_GATEWAY_URL: str = "localhost:7051"
    FABRIC_CHANNEL: str = "nyayrakshachannel"
    FABRIC_CHAINCODE: str = "nyayrakshacc"
    FABRIC_MSP_ID: str = "Org1MSP"

    # AI & OCR
    AI_MODE: str = "local"  # "local" or "external"
    OPENAI_API_KEY: str = ""
    OCR_ENABLED: bool = True
    MAX_FILE_SIZE_MB: int = 25

    # SMTP / Notifications
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "no-reply@nyayraksha.local"


settings = Settings()
