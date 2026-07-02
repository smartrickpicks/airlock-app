"""Unit tests for src/lib/crypto.py — Fernet token encryption/decryption.

TDD: RED -> GREEN -> REFACTOR
Tests cover:
- Happy path: encrypt -> decrypt round-trip
- Empty string input
- Unicode / emoji characters
- Large payload
- Decryption with wrong key raises TokenEncryptionError
- Decryption of tampered ciphertext raises TokenEncryptionError
- Missing key raises TokenEncryptionError
- encrypt_token returns a different string each call (non-deterministic)
"""

from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet

# Generate a valid test key for all tests
_TEST_KEY = Fernet.generate_key().decode()


@pytest.fixture(autouse=True)
def _patch_key(monkeypatch):
    """Patch TOKEN_ENCRYPTION_KEY for every test and clear lru_cache."""
    from src.lib import crypto as crypto_module

    # Clear cached Fernet instance between tests
    crypto_module._get_fernet.cache_clear()
    monkeypatch.setattr("src.lib.crypto.settings.token_encryption_key", _TEST_KEY)
    yield
    crypto_module._get_fernet.cache_clear()


class TestEncryptToken:
    def test_returns_string(self):
        from src.lib.crypto import encrypt_token

        result = encrypt_token("hello")
        assert isinstance(result, str)

    def test_ciphertext_differs_from_plaintext(self):
        from src.lib.crypto import encrypt_token

        assert encrypt_token("secret-value") != "secret-value"

    def test_non_deterministic(self):
        """Fernet uses a random IV, so two encryptions of same plaintext differ."""
        from src.lib.crypto import encrypt_token

        ct1 = encrypt_token("same-input")
        ct2 = encrypt_token("same-input")
        assert ct1 != ct2

    def test_empty_string(self):
        """Empty string should encrypt without error."""
        from src.lib.crypto import encrypt_token

        result = encrypt_token("")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_unicode_input(self):
        from src.lib.crypto import encrypt_token

        result = encrypt_token("héllo wörld 🔑")
        assert isinstance(result, str)

    def test_large_payload(self):
        """1MB payload should encrypt without error."""
        from src.lib.crypto import encrypt_token

        big = "x" * (1024 * 1024)
        result = encrypt_token(big)
        assert isinstance(result, str)

    def test_special_chars(self):
        from src.lib.crypto import encrypt_token

        result = encrypt_token("'; DROP TABLE workspaces; --")
        assert isinstance(result, str)


class TestDecryptToken:
    def test_round_trip(self):
        from src.lib.crypto import decrypt_token, encrypt_token

        plaintext = "my-secret-google-refresh-token"
        assert decrypt_token(encrypt_token(plaintext)) == plaintext

    def test_empty_string_round_trip(self):
        from src.lib.crypto import decrypt_token, encrypt_token

        assert decrypt_token(encrypt_token("")) == ""

    def test_unicode_round_trip(self):
        from src.lib.crypto import decrypt_token, encrypt_token

        value = "héllo 🔑 wörld"
        assert decrypt_token(encrypt_token(value)) == value

    def test_large_payload_round_trip(self):
        from src.lib.crypto import decrypt_token, encrypt_token

        big = "z" * (512 * 1024)
        assert decrypt_token(encrypt_token(big)) == big

    def test_invalid_ciphertext_raises(self):
        from src.lib.crypto import TokenEncryptionError, decrypt_token

        with pytest.raises(TokenEncryptionError):
            decrypt_token("not-valid-ciphertext")

    def test_tampered_ciphertext_raises(self):
        from src.lib.crypto import TokenEncryptionError, decrypt_token, encrypt_token

        ct = encrypt_token("original")
        # Flip a few chars in the middle to tamper
        tampered = ct[:10] + "XXXXXX" + ct[16:]
        with pytest.raises(TokenEncryptionError):
            decrypt_token(tampered)

    def test_wrong_key_raises(self):
        from src.lib import crypto as crypto_module
        from src.lib.crypto import TokenEncryptionError, encrypt_token

        ct = encrypt_token("value-encrypted-with-test-key")

        # Switch to a different key
        different_key = Fernet.generate_key().decode()
        crypto_module._get_fernet.cache_clear()
        with patch("src.lib.crypto.settings") as mock_settings:
            mock_settings.token_encryption_key = different_key
            # Need to re-import to pick up patched settings via _get_fernet
            crypto_module._get_fernet.cache_clear()
            with pytest.raises(TokenEncryptionError):
                crypto_module.decrypt_token(ct)


class TestMissingKey:
    def test_encrypt_with_empty_key_raises(self, monkeypatch):
        from src.lib import crypto as crypto_module
        from src.lib.crypto import TokenEncryptionError

        crypto_module._get_fernet.cache_clear()
        monkeypatch.setattr("src.lib.crypto.settings.token_encryption_key", "")
        with pytest.raises(TokenEncryptionError, match="TOKEN_ENCRYPTION_KEY"):
            crypto_module.encrypt_token("anything")

    def test_decrypt_with_empty_key_raises(self, monkeypatch):
        from src.lib import crypto as crypto_module
        from src.lib.crypto import TokenEncryptionError

        crypto_module._get_fernet.cache_clear()
        monkeypatch.setattr("src.lib.crypto.settings.token_encryption_key", "")
        with pytest.raises(TokenEncryptionError, match="TOKEN_ENCRYPTION_KEY"):
            crypto_module.decrypt_token("anything")
