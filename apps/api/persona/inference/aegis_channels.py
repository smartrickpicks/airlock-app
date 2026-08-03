"""AEGIS Channel Classifier — routes audio/text to the right co-pilot channel.

Four channels:
  - recon:       Pre-meeting behavioral brief
  - live_coach:  Real-time delivery feedback
  - comms_relay: Cross-platform message routing
  - ambient:     Silent monitoring, intervenes only when needed

Each channel maps to a Dharma Router intent for model selection.
"""

from __future__ import annotations

from dataclasses import dataclass


CHANNEL_INTENTS: dict[str, str] = {
    "recon": "aegis_recon",
    "live_coach": "aegis_live_coach",
    "comms_relay": "aegis_comms_relay",
    "ambient": "aegis_ambient",
    "casual": "casual_chat",
}

ESCALATION_INTENTS: dict[str, str] = {
    "live_coach_stressed": "aegis_live_coach",   # escalation handled by router
    "ambient_distress": "aegis_ambient",          # escalation handled by router
}


@dataclass
class AegisChannel:
    """Classification result for an AEGIS input."""
    channel: str
    confidence: float
    dharma_intent: str
    escalated: bool = False
    reason: str = ""


def classify_channel(
    text: str = "",
    context: dict | None = None,
) -> AegisChannel:
    """Classify input into an AEGIS channel.

    Priority order:
    1. Incoming message → comms_relay
    2. Biometric anomaly → ambient
    3. Calendar/meeting context → recon
    4. Active conversation + coaching signals → live_coach
    5. Default → casual
    """
    ctx = context or {}

    if ctx.get("incoming_message"):
        return AegisChannel(
            channel="comms_relay",
            confidence=0.95,
            dharma_intent=CHANNEL_INTENTS["comms_relay"],
            reason=f"Incoming from {ctx.get('source', 'unknown')}",
        )

    if ctx.get("heart_rate_spike") or ctx.get("biometric_alert"):
        distress = ctx.get("user_distress", False)
        intent = ESCALATION_INTENTS["ambient_distress"] if distress else CHANNEL_INTENTS["ambient"]
        return AegisChannel(
            channel="ambient",
            confidence=0.90,
            dharma_intent=intent,
            escalated=distress,
            reason="Biometric anomaly detected",
        )

    if ctx.get("has_calendar_event") or _is_brief_request(text):
        return AegisChannel(
            channel="recon",
            confidence=0.85,
            dharma_intent=CHANNEL_INTENTS["recon"],
            reason="Meeting context or brief request",
        )

    if ctx.get("in_conversation"):
        voice = ctx.get("voice_analysis", {})
        stressed = voice.get("tone") == "stressed" or voice.get("pace") == "fast"
        if stressed:
            return AegisChannel(
                channel="live_coach",
                confidence=0.88,
                dharma_intent=ESCALATION_INTENTS["live_coach_stressed"],
                escalated=True,
                reason="Stress signals in voice",
            )
        return AegisChannel(
            channel="live_coach",
            confidence=0.80,
            dharma_intent=CHANNEL_INTENTS["live_coach"],
            reason="Active conversation coaching",
        )

    return AegisChannel(
        channel="casual",
        confidence=0.50,
        dharma_intent=CHANNEL_INTENTS["casual"],
        reason="No AEGIS context detected",
    )


def _is_brief_request(text: str) -> bool:
    keywords = {"brief", "prep", "meeting", "who am i meeting", "read the room"}
    lower = text.lower()
    return any(kw in lower for kw in keywords)
