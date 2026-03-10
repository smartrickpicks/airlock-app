"""Email service — sends transactional emails via Resend API."""

import os

import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM_EMAIL", "Brain Brigade <invite@airlock.so>")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")


async def send_invite_email(
    to_email: str,
    workspace_name: str,
    inviter_name: str,
    token: str,
) -> dict:
    """Send a magic link invite email via Resend."""
    join_url = f"{APP_URL}/join/{token}"

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

    if not RESEND_API_KEY:
        print(f"[EMAIL] Would send invite to {to_email}: {join_url}")
        return {"id": "dev_mock", "join_url": join_url}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": RESEND_FROM,
                "to": [to_email],
                "subject": f"You've been invited to {workspace_name}",
                "html": html,
            },
        )
        response.raise_for_status()
        return response.json()
