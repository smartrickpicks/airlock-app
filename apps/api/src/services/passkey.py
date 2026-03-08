"""Passkey (WebAuthn) service — registration and authentication."""

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from src.models.passkey import PasskeyCredential
from src.models.user import User
from src.services.jwt import create_access_token, create_refresh_token

logger = logging.getLogger(__name__)

# RP (Relying Party) configuration
RP_ID = "localhost"  # TODO: make configurable via settings
RP_NAME = "Airlock"
RP_ORIGIN = "http://localhost:3000"

# In-memory challenge store (use Redis in production)
_challenge_store: dict[str, bytes] = {}


def get_registration_options(user: User) -> dict:
    """Generate WebAuthn registration options for an authenticated user."""
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=user.id.encode(),
        user_name=user.email,
        user_display_name=user.display_name,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    # Store challenge for verification
    _challenge_store[user.id] = options.challenge

    return {
        "options": options_to_json(options),
        "user_id": user.id,
    }


def verify_registration(
    user: User,
    credential_json: dict,
    db: Session,
    device_name: str | None = None,
) -> PasskeyCredential | None:
    """Verify WebAuthn registration response and store credential."""
    challenge = _challenge_store.pop(user.id, None)
    if not challenge:
        logger.warning("No challenge found for user %s", user.id)
        return None

    try:
        verification = verify_registration_response(
            credential=credential_json,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
        )
    except Exception as e:
        logger.warning("Registration verification failed: %s", e)
        return None

    credential = PasskeyCredential(
        id=str(ULID()),
        user_id=user.id,
        workspace_id=user.workspace_id,
        credential_id=bytes_to_base64url(verification.credential_id),
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        aaguid=str(verification.aaguid) if verification.aaguid else None,
        device_name=device_name or "Passkey",
        transports=None,
        backed_up=getattr(verification, "credential_backed_up", False),
    )
    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


def get_authentication_options(db: Session, email: str | None = None) -> dict:
    """Generate WebAuthn authentication options."""
    allow_credentials: list[PublicKeyCredentialDescriptor] = []

    if email:
        stmt = select(User).where(User.email == email)
        user = db.execute(stmt).scalar_one_or_none()
        if user:
            creds = (
                db.query(PasskeyCredential)
                .filter(
                    PasskeyCredential.user_id == user.id,
                    PasskeyCredential.deleted_at.is_(None),
                )
                .all()
            )
            allow_credentials = [
                PublicKeyCredentialDescriptor(
                    id=bytes.fromhex(c.credential_id)
                    if len(c.credential_id) % 2 == 0
                    else c.credential_id.encode(),
                )
                for c in creds
            ]

    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials if allow_credentials else None,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    # Store challenge keyed by a session identifier
    session_key = email or "anonymous"
    _challenge_store[session_key] = options.challenge

    return {
        "options": options_to_json(options),
        "session_key": session_key,
    }


def verify_authentication(
    credential_json: dict,
    session_key: str,
    db: Session,
) -> dict | None:
    """Verify WebAuthn authentication response and return JWT pair."""
    challenge = _challenge_store.pop(session_key, None)
    if not challenge:
        logger.warning("No challenge found for session %s", session_key)
        return None

    # Find the credential in the database
    credential_id_b64 = credential_json.get("id", "")
    stored_cred = (
        db.query(PasskeyCredential)
        .filter(
            PasskeyCredential.credential_id == credential_id_b64,
            PasskeyCredential.deleted_at.is_(None),
        )
        .first()
    )

    if not stored_cred:
        logger.warning("No stored credential found for id %s", credential_id_b64)
        return None

    try:
        verification = verify_authentication_response(
            credential=credential_json,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            credential_public_key=stored_cred.public_key,
            credential_current_sign_count=stored_cred.sign_count,
        )
    except Exception as e:
        logger.warning("Authentication verification failed: %s", e)
        return None

    # Update sign count and last-used timestamp
    stored_cred.sign_count = verification.new_sign_count
    stored_cred.last_used_at = datetime.now(UTC)
    db.commit()

    # Load user
    user = db.query(User).filter(User.id == stored_cred.user_id).first()
    if not user:
        return None

    token_data = {
        "sub": user.id,
        "email": user.email,
        "workspace_id": user.workspace_id,
        "org_role": user.org_role,
    }

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "org_role": user.org_role,
        },
    }


def list_credentials(db: Session, user_id: str) -> list[dict]:
    """List all passkey credentials for a user."""
    creds = (
        db.query(PasskeyCredential)
        .filter(
            PasskeyCredential.user_id == user_id,
            PasskeyCredential.deleted_at.is_(None),
        )
        .all()
    )
    return [
        {
            "id": c.id,
            "device_name": c.device_name,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
            "backed_up": c.backed_up,
        }
        for c in creds
    ]


def delete_credential(db: Session, user_id: str, credential_id: str) -> bool:
    """Soft-delete a passkey credential."""
    cred = (
        db.query(PasskeyCredential)
        .filter(
            PasskeyCredential.id == credential_id,
            PasskeyCredential.user_id == user_id,
            PasskeyCredential.deleted_at.is_(None),
        )
        .first()
    )
    if not cred:
        return False
    cred.deleted_at = datetime.now(UTC)
    db.commit()
    return True
