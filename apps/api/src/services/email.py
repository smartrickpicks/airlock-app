"""Email service — sends transactional emails via Resend SDK."""

import logging

import resend

from src.config import settings

logger = logging.getLogger(__name__)


def _init_resend() -> bool:
    """Initialize Resend SDK. Returns True if API key is configured."""
    if not settings.resend_api_key:
        return False
    resend.api_key = settings.resend_api_key
    return True


# ── Invite Email ─────────────────────────────────────────────────────────────


async def send_invite_email(
    to_email: str,
    workspace_name: str,
    inviter_name: str,
    token: str,
) -> dict:
    """Send a magic link invite email via Resend."""
    join_url = f"{settings.app_url}/join/{token}"

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #f5f5f5;">
            You've been invited to {workspace_name}
        </h1>
        <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6;">
            {inviter_name} has invited you to join {workspace_name} on Airlock.
        </p>
        <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6;">
            When you join, Otto (our AI assistant) will learn about your
            working style and set up a personalized workspace just for you.
        </p>
        <a href="{join_url}"
           style="display: inline-block; margin-top: 20px; padding: 12px 32px;
                  background: #6366f1; color: white; text-decoration: none;
                  border-radius: 8px; font-weight: 600; font-size: 14px;">
            Join {workspace_name}
        </a>
        <p style="color: #737373; font-size: 12px; margin-top: 24px;">
            This invite expires in 7 days.
        </p>
    </div>
    """

    if not _init_resend():
        logger.info("[EMAIL] Would send invite to %s: %s", to_email, join_url)
        return {"id": "dev_mock", "join_url": join_url}

    result = resend.Emails.send(
        {
            "from": settings.resend_from_email,
            "to": [to_email],
            "subject": f"You've been invited to {workspace_name}",
            "html": html,
        }
    )
    logger.info("[EMAIL] Invite sent to %s: %s", to_email, result.get("id"))
    return result


# ── Vault Notification Email ─────────────────────────────────────────────────


async def send_vault_notification(
    to_email: str,
    workspace_name: str,
    vault_name: str,
    event_type: str,
    summary: str,
    vault_url: str | None = None,
) -> dict:
    """Send a vault event notification email."""
    url = vault_url or settings.app_url
    event_label = event_type.replace("_", " ").title()

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <p style="color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
            {workspace_name}
        </p>
        <h1 style="font-size: 20px; font-weight: 700; color: #f5f5f5; margin-top: 8px;">
            {event_label}: {vault_name}
        </h1>
        <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6;">
            {summary}
        </p>
        <a href="{url}"
           style="display: inline-block; margin-top: 16px; padding: 10px 24px;
                  background: #6366f1; color: white; text-decoration: none;
                  border-radius: 8px; font-weight: 600; font-size: 13px;">
            View Vault
        </a>
    </div>
    """

    if not _init_resend():
        logger.info("[EMAIL] Would send vault notification to %s: %s", to_email, event_label)
        return {"id": "dev_mock"}

    result = resend.Emails.send(
        {
            "from": settings.resend_from_email,
            "to": [to_email],
            "subject": f"[{workspace_name}] {event_label} — {vault_name}",
            "html": html,
        }
    )
    logger.info("[EMAIL] Vault notification sent to %s: %s", to_email, result.get("id"))
    return result


# ── Weekly Digest Email ──────────────────────────────────────────────────────


async def send_weekly_digest(
    to_email: str,
    workspace_name: str,
    stats: dict,
) -> dict:
    """Send a weekly workspace activity digest."""
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <p style="color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
            Weekly Digest
        </p>
        <h1 style="font-size: 20px; font-weight: 700; color: #f5f5f5; margin-top: 8px;">
            {workspace_name} — This Week
        </h1>
        <div style="margin-top: 20px; padding: 16px; background: #1a1a1a; border-radius: 8px;">
            <table style="width: 100%; color: #a3a3a3; font-size: 14px;">
                <tr>
                    <td style="padding: 8px 0;">Vaults created</td>
                    <td style="text-align: right; font-weight: 600; color: #f5f5f5;">{stats.get("vaults_created", 0)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Chambers advanced</td>
                    <td style="text-align: right; font-weight: 600; color: #f5f5f5;">{stats.get("chambers_advanced", 0)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Patches resolved</td>
                    <td style="text-align: right; font-weight: 600; color: #f5f5f5;">{stats.get("patches_resolved", 0)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Tasks completed</td>
                    <td style="text-align: right; font-weight: 600; color: #f5f5f5;">{stats.get("tasks_completed", 0)}</td>
                </tr>
            </table>
        </div>
        <a href="{settings.app_url}"
           style="display: inline-block; margin-top: 20px; padding: 10px 24px;
                  background: #6366f1; color: white; text-decoration: none;
                  border-radius: 8px; font-weight: 600; font-size: 13px;">
            Open Airlock
        </a>
    </div>
    """

    if not _init_resend():
        logger.info("[EMAIL] Would send weekly digest to %s", to_email)
        return {"id": "dev_mock"}

    result = resend.Emails.send(
        {
            "from": settings.resend_from_email,
            "to": [to_email],
            "subject": f"[{workspace_name}] Weekly Digest",
            "html": html,
        }
    )
    logger.info("[EMAIL] Weekly digest sent to %s: %s", to_email, result.get("id"))
    return result
