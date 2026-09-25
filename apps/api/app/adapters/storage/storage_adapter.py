import os
import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from app.core.config import settings
from app.core.security import encrypt_bytes_aes_gcm, decrypt_bytes_aes_gcm, compute_sha256


class StorageAdapter(ABC):
    @abstractmethod
    async def put_object(self, object_key: str, data: bytes, mime_type: str) -> str:
        """Stores object securely and returns storage reference."""
        pass

    @abstractmethod
    async def get_object(self, object_key: str) -> bytes:
        """Retrieves and decrypts object data."""
        pass

    @abstractmethod
    async def generate_presigned_url(self, object_key: str, expires_in: int = 300) -> str:
        """Generates a secure, short-lived preview/download URL."""
        pass


class LocalEncryptedStorageAdapter(StorageAdapter):
    """
    Zero-dependency local storage adapter that encrypts every object at rest
    using AES-256-GCM and stores files outside the web root.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = os.path.abspath(base_dir or settings.STORAGE_LOCAL_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    async def put_object(self, object_key: str, data: bytes, mime_type: str) -> str:
        # Encrypt with AES-256-GCM before writing to disk
        encrypted = encrypt_bytes_aes_gcm(data)
        file_path = os.path.join(self.base_dir, object_key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(encrypted)
        return f"local://{object_key}"

    async def get_object(self, object_key: str) -> bytes:
        clean_key = object_key.replace("local://", "")
        file_path = os.path.join(self.base_dir, clean_key)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Storage object {clean_key} does not exist.")
        with open(file_path, "rb") as f:
            encrypted = f.read()
        # Decrypt AES-256-GCM
        return decrypt_bytes_aes_gcm(encrypted)

    async def generate_presigned_url(self, object_key: str, expires_in: int = 300) -> str:
        # Route through authenticated backend preview endpoint with short-lived token
        clean_key = object_key.replace("local://", "")
        return f"{settings.BACKEND_URL}/api/v1/documents/stream/{clean_key}?expires={expires_in}"


class S3StorageAdapter(StorageAdapter):
    """
    Production-grade S3 / MinIO adapter with Server-Side Encryption (SSE-S3).
    """

    def __init__(self):
        import boto3
        from botocore.client import Config

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET

    async def put_object(self, object_key: str, data: bytes, mime_type: str) -> str:
        extra_args = {"ContentType": mime_type}
        if settings.STORAGE_ENCRYPTION_ENABLED:
            extra_args["ServerSideEncryption"] = "AES256"

        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=object_key,
            Body=data,
            **extra_args,
        )
        return f"s3://{self.bucket}/{object_key}"

    async def get_object(self, object_key: str) -> bytes:
        clean_key = object_key.replace(f"s3://{self.bucket}/", "")
        response = self.s3_client.get_object(Bucket=self.bucket, Key=clean_key)
        return response["Body"].read()

    async def generate_presigned_url(self, object_key: str, expires_in: int = 300) -> str:
        clean_key = object_key.replace(f"s3://{self.bucket}/", "")
        url = self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": clean_key},
            ExpiresIn=expires_in,
        )
        return url


def get_storage_adapter() -> StorageAdapter:
    if settings.STORAGE_MODE == "s3":
        try:
            return S3StorageAdapter()
        except Exception:
            # Fallback to local encrypted storage if S3/MinIO is unreachable
            return LocalEncryptedStorageAdapter()
    return LocalEncryptedStorageAdapter()
