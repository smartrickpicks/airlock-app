"""Google Calendar sync service."""

import logging
from datetime import UTC, datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"


async def sync_google_calendar(
    access_token: str,
    days_ahead: int = 30,
) -> list[dict]:
    """Pull calendar events from Google Calendar API.

    Falls back to mock events if no valid token or API unavailable.
    """
    if not access_token or access_token.startswith("dev_") or access_token.startswith("invite_"):
        return _mock_calendar_events(days_ahead)

    try:
        now = datetime.now(UTC)
        time_min = now.isoformat()
        time_max = (now + timedelta(days=days_ahead)).isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "timeMin": time_min,
                    "timeMax": time_max,
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": 50,
                },
            )
            response.raise_for_status()
            data = response.json()

            events = []
            for item in data.get("items", []):
                start = item.get("start", {})
                end = item.get("end", {})
                events.append(
                    {
                        "google_event_id": item.get("id"),
                        "title": item.get("summary", "Untitled"),
                        "description": item.get("description"),
                        "start_at": start.get("dateTime") or start.get("date"),
                        "end_at": end.get("dateTime") or end.get("date"),
                        "location": item.get("location"),
                        "attendees": [
                            {"name": a.get("displayName", a.get("email", ""))}
                            for a in item.get("attendees", [])
                        ],
                        "source": "google_calendar",
                    }
                )
            return events
    except Exception:
        logger.warning("[CALENDAR] Google API failed, using mock")
        return _mock_calendar_events(days_ahead)


def _mock_calendar_events(days_ahead: int = 30) -> list[dict]:
    """Generate realistic mock calendar events for demo."""
    now = datetime.now(UTC)
    events = []

    mock_events = [
        ("Team Standup", "Daily sync with the product team", 1, 9, 30),
        ("1:1 with Sarah", "Weekly product strategy sync", 2, 10, 60),
        (
            "Client Call — Summit Publishing",
            "Contract review follow-up",
            3,
            14,
            45,
        ),
        ("Board Prep", "Q1 board deck review", 4, 11, 90),
        ("Design Review", "UI/UX review for new features", 5, 15, 60),
        ("Investor Update", "Monthly investor newsletter prep", 7, 10, 30),
        ("Team Retro", "Sprint retrospective", 8, 16, 60),
        ("Product Demo", "Demo new features to stakeholders", 10, 14, 45),
        ("Hiring Panel", "Interview — Senior Engineer", 12, 11, 60),
        (
            "Strategy Offsite Prep",
            "Prepare materials for Q2 offsite",
            14,
            9,
            120,
        ),
        (
            "Contract Review — Acme",
            "Review distribution agreement",
            6,
            13,
            60,
        ),
        ("Marketing Sync", "Go-to-market alignment", 9, 10, 45),
        (
            "Tech Architecture Review",
            "Platform scalability discussion",
            11,
            15,
            90,
        ),
        (
            "Customer Success Check-in",
            "Quarterly review with CS team",
            13,
            11,
            30,
        ),
    ]

    for title, desc, day_offset, hour, duration_mins in mock_events:
        if day_offset > days_ahead:
            continue
        start = now.replace(hour=hour, minute=0, second=0, microsecond=0) + timedelta(
            days=day_offset
        )
        end = start + timedelta(minutes=duration_mins)
        events.append(
            {
                "google_event_id": f"gcal_{day_offset}_{hour}",
                "title": title,
                "description": desc,
                "start_at": start.isoformat(),
                "end_at": end.isoformat(),
                "location": None,
                "attendees": [],
                "source": "google_calendar",
            }
        )

    return sorted(events, key=lambda e: e["start_at"])
