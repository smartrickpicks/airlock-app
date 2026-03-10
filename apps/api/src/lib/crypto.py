"""Symmetric encryption for sensitive tokens (Google refresh tokens, AI API keys).

Uses Fernet (AES-128-CBC + HMAC-SHA256) from the cryptography library.
Key is loaded from the TOKEN_ENCRYPTION_KEY setting (via config.py).

Generate a key with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

import logging
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from src.config import settings

logger = logging.getLogger(__name__)


class TokenEncryptionError(Exception):
    """Raised when encryption or decryption fails."""


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    key = settings.token_encryption_key
    if not key:
        raise TokenEncryptionError(
            "TOKEN_ENCRYPTION_KEY environment variable is not set. "
            'Generate one with: python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )
    return Fernet(key.encode())


def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext token. Returns base64-encoded ciphertext."""
    try:
        return _get_fernet().encrypt(plaintext.encode()).decode()
    except TokenEncryptionError:
        raise
    except Exception:
        logger.error("Encryption failed: unexpected error")
        raise TokenEncryptionError("Encryption failed") from None


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a ciphertext token. Returns plaintext string."""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as e:
        logger.error("Decryption failed: invalid token or key")
        raise TokenEncryptionError("Decryption failed: invalid token or key") from e
    except TokenEncryptionError:
        raise
    except Exception:
        logger.error("Decryption failed: unexpected error")
        raise TokenEncryptionError("Decryption failed") from None
