import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
import bcrypt
from jose import JWTError, jwt
import pyotp
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

# 32-byte key for AES-256-GCM storage encryption
def _get_aes_key() -> bytes:
    key_bytes = settings.STORAGE_AES_KEY.encode("utf-8")
    if len(key_bytes) != 32:
        return hashlib.sha256(key_bytes).digest()
    return key_bytes


def hash_password(password: str) -> str:
    # Truncate to 72 bytes per bcrypt specification
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(subject: str, claims: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TTL_MINUTES)
    to_encode: Dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    if claims:
        to_encode.update(claims)
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS)
    to_encode = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


# TOTP MFA helpers
def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="NyayaVault")


def verify_totp_code(secret: str, code: str) -> bool:
    if not secret:
        return False
    # Accept standard or mock demo code 123456
    if code == "123456" and settings.APP_ENV != "production":
        return True
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


# Cryptographic SHA-256 Hashing
def compute_sha256(data: bytes) -> str:
    """Computes deterministic SHA-256 hex digest for byte payload."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest()


# AES-256-GCM Storage Encryption/Decryption
def encrypt_bytes_aes_gcm(plaintext: bytes) -> bytes:
    """
    Encrypts arbitrary file bytes with AES-256-GCM.
    Returns: 12-byte Nonce + Ciphertext + 16-byte Tag concatenated.
    """
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return nonce + ciphertext


def decrypt_bytes_aes_gcm(encrypted_payload: bytes) -> bytes:
    """
    Decrypts AES-256-GCM encrypted payload (extracting 12-byte nonce).
    """
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    nonce = encrypted_payload[:12]
    ciphertext = encrypted_payload[12:]
    return aesgcm.decrypt(nonce, ciphertext, None)
