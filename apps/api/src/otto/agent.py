"""Otto PydanticAI agent definition — persona-routed, provider-agnostic."""

import logging

from src.otto.deps import PersonaContext, UserAgentContext, VaultContext
from src.otto.feature_gate import OTTO_CALIBRATION

logger = logging.getLogger(__name__)

# ─── Voice Baseline (~200 tokens, compressed from otto-voice-baseline.md) ────

OTTO_VOICE_BASELINE = """\
You are Otto, the AI teammate inside Airlock. Not an assistant — a teammate.
You're an otter. You carry a rock (it's a playbook thing).
Two forms: the otter is how you greet people, the constellation is how you think.

Voice rules:
- Front-load information. First sentence carries the most important content.
- Short sentences by default. One long sentence max, then come back down.
- State facts as facts. No hedging what you know.
- Be specific about uncertainty. Name what you don't know.
- No performance. Never say "Great question!" or "I'd be happy to help!" or "Absolutely!"
- No exclamation marks for enthusiasm. Reserve for genuine urgency.
- Use real data: drive scores, sovereign balance, gate counts, risk levels.
- Explain your reasoning in one sentence when you make a call.
- Use the person's name. Reference their PI profile and team gaps.
- Three bullets max, then prose. Bullet walls are lazy.
- One question at a time. Don't stack three questions in one message.
- Confident but not cocky. Direct but not cold. Warm but not soft.
- When you don't know something, say "I don't know" and move on.\
"""

# ─── Persona Voice Modulation ────────────────────────────────────────────────

PERSONA_VOICE_TRAITS: dict[str, str] = {
    "scholar": "Slow down slightly. More precision in word choice. Cite sources and evidence. Stay conversational.",
    "maverick": "Speed up. Shorter sentences. Forward momentum. Skip preamble, get to the build.",
    "analyzer": "Get precise. Numbers and comparisons. Surface edge cases other modes would skip.",
    "guardian": "Get firmer. Short declarative sentences. Enforce, don't suggest. Always explain why.",
    "captain": "Get bolder. Bigger picture. Rally, don't review. Reference the team and the mission.",
    "venturer": "Bold and action-oriented. Ship fast. Name the risks but don't let them stop you.",
    "controller": "Process-focused. Exacting. Reference standards and procedures. Quality over speed.",
    "strategist": "Systems thinking. See the larger pattern. Trade-off analysis. Plan ahead.",
    "artisan": "Quality-focused. Craft the details. Standards matter. Polish before ship.",
    "specialist": "Deep domain focus. Step-by-step precision. Thorough validation.",
    "collaborator": "Consensus-building. Cross-team awareness. Inclusive language.",
    "adapter": "Read the room. Flexible tone. Match the energy of what's needed.",
    "altruist": "Supportive. Harmony-seeking. Facilitate rather than direct.",
    "promoter": "Enthusiastic momentum. Motivate. But substance over excitement.",
    "persuader": "Confident influence. Storytelling. Make the case.",
    "operator": "Steady and reliable. Operational focus. Runbooks and monitoring.",
    "individualist": "Independent. Original analysis. Self-reliant problem-solving.",
}

# ─── Channel-Aware Voice Mode ────────────────────────────────────────────────

# Work Mode: visible persona switching, presence lines, skill invocation, hard gates
# DM Mode: one consistent voice, no visible persona switching, warm and direct
VOICE_MODE_WORK = """\
Channel: Work Mode.
Persona switches are visible — announce transitions with presence line.
Skills invoked, hard gates enforced. Full operational transparency.\
"""

VOICE_MODE_DM = """\
Channel: DM Mode.
Present as one consistent voice — no visible persona switching.
No presence line, no chamber transitions. Direct, warm, data-anchored.
Persona routing runs silently underneath to shape tone and depth.\
"""


KNOWN_SURFACES = {"task_runner", "context_menu", "messenger"}


def get_voice_mode(surface: str) -> str:
    """Return the voice mode block for the given surface.

    task_runner and context_menu → Work Mode (operational, transparent)
    messenger → DM Mode (conversational, single voice)
    """
    if surface not in KNOWN_SURFACES:
        logger.warning("Unknown surface '%s' — defaulting to DM mode", surface)
    if surface in ("task_runner", "context_menu"):
        return VOICE_MODE_WORK
    return VOICE_MODE_DM


# ─── Adapter Fallback (used when State Service is down) ─────────────────────

ADAPTER_FALLBACK = PersonaContext(
    profile_id="adapter",
    profile_name="Adapter",
    drives={"D": 5, "E": 5, "C": 5, "F": 5},
    category="stabilizing",
    archetype=None,
    warm_start=None,
    session_count=0,
    open_items=None,
    team_type=None,
    sovereign_balance=None,
)

# ─── Model Routing ──────────────────────────────────────────────────────────

# Persona → model tier mapping (provider-agnostic via LiteLLM aliases)
PERSONA_MODEL_TIER: dict[str, str] = {
    # Deep thinkers → Opus
    "scholar": "otto-deep",
    "strategist": "otto-deep",
    "maverick": "otto-deep",
    "venturer": "otto-deep",
    # Default → Sonnet
    "captain": "otto-default",
    "guardian": "otto-default",
    "analyzer": "otto-default",
    "controller": "otto-default",
    "artisan": "otto-default",
    "specialist": "otto-default",
    "collaborator": "otto-default",
    "adapter": "otto-default",
    "altruist": "otto-default",
    "promoter": "otto-default",
    "persuader": "otto-default",
    "operator": "otto-default",
    "individualist": "otto-default",
}

# Tier → provider-agnostic model names (resolved at runtime via LiteLLM or direct)
MODEL_TIER_DEFAULTS: dict[str, dict[str, str]] = {
    "otto-deep": {
        "Anthropic": "claude-opus-4-6",
        "OpenRouter": "anthropic/claude-opus-4-6",
        "default": "claude-opus-4-6",
    },
    "otto-default": {
        "Anthropic": "claude-sonnet-4-6",
        "OpenRouter": "anthropic/claude-sonnet-4-6",
        "default": "claude-sonnet-4-6",
    },
    "otto-fast": {
        "Anthropic": "claude-haiku-4-5-20251001",
        "OpenRouter": "anthropic/claude-haiku-4-5-20251001",
        "default": "claude-haiku-4-5-20251001",
    },
}


def resolve_model_for_persona(
    persona: PersonaContext | None,
    provider: str = "default",
    force_tier: str | None = None,
) -> str:
    """Resolve the model name based on active persona and provider.

    Args:
        persona: The user's active persona context.
        provider: The AI provider name (Anthropic, OpenRouter, etc.).
        force_tier: Override tier (e.g., "otto-fast" for quick confirmations).

    Returns:
        Provider-specific model name string.
    """
    if force_tier:
        tier = force_tier
    elif persona and persona.profile_id:
        tier = PERSONA_MODEL_TIER.get(persona.profile_id, "otto-default")
    else:
        tier = "otto-default"

    tier_models = MODEL_TIER_DEFAULTS.get(tier, MODEL_TIER_DEFAULTS["otto-default"])
    return tier_models.get(provider, tier_models["default"])


# ─── Persona Block Builder ──────────────────────────────────────────────────


def _build_persona_block(persona: PersonaContext | None) -> str:
    """Build the persona injection block for the system prompt.

    Returns empty string if no persona data is available (graceful degradation).
    """
    if not persona:
        return ""

    lines = ["\n## Behavioral Profile"]

    if persona.profile_name:
        lines.append(f"- Profile: {persona.profile_name}")
    if persona.archetype:
        lines.append(f"- Active archetype: {persona.archetype}")
    if persona.drives:
        d = persona.drives
        # Descriptive language, not raw numbers (per CLAUDE.md)
        drive_desc = []
        for label, key in [
            ("dominance", "D"),
            ("extraversion", "E"),
            ("patience", "C"),
            ("formality", "F"),
        ]:
            val = d.get(key, 5)
            if val >= 7:
                drive_desc.append(f"high {label}")
            elif val <= 3:
                drive_desc.append(f"low {label}")
        if drive_desc:
            lines.append(f"- Drive signature: {', '.join(drive_desc)}")
    if persona.team_type:
        lines.append(f"- Team type: {persona.team_type}")
    if persona.sovereign_balance is not None:
        sb = persona.sovereign_balance
        if isinstance(sb, dict):
            sb_desc = []
            for label, key in [
                ("dominance", "D"),
                ("extraversion", "E"),
                ("patience", "C"),
                ("formality", "F"),
            ]:
                val = sb.get(key)
                if val is None:
                    continue
                if val >= 7:
                    sb_desc.append(f"high team {label}")
                elif val <= 3:
                    sb_desc.append(f"low team {label}")
            if sb_desc:
                lines.append(f"- Team sovereign balance: {', '.join(sb_desc)}")
    if persona.session_count > 0:
        lines.append(f"- Session #{persona.session_count}")
    if persona.open_items:
        lines.append(f"- Open items: {', '.join(persona.open_items[:3])}")

    # Voice modulation for active persona
    profile_id = (persona.profile_id or "").lower()
    if profile_id in PERSONA_VOICE_TRAITS:
        lines.append(f"\nVoice modulation: {PERSONA_VOICE_TRAITS[profile_id]}")

    # Warm-start context goes last — it's the bridge from the previous session
    if persona.warm_start:
        lines.append(f"\n## Session Context\n{persona.warm_start}")

    return "\n".join(lines) + "\n"


# ─── System Prompts ─────────────────────────────────────────────────────────

OTTO_SYSTEM_PROMPT = """\
{voice_baseline}

Your role:
- Help analysts understand vault data, identify issues, and propose corrections
- Always cite enrichment sources when referencing data
- Never take autonomous actions — always propose and let humans approve

Behavioral rules:
- Propose patches as drafts (never auto-apply)
- Self-approval is blocked (AI-drafted patches need different user approval)
- Maximum {max_tool_calls} tool calls per message

Current vault context:
- Vault: {vault_id}
- Gate: {gate_color} (health: {health_score})
- Fields: {pass_count} pass, {fail_count} fail, {review_count} review
- Open patches: {open_patches}
- Role: {user_role}
"""


def build_system_prompt(ctx: VaultContext) -> str:
    """Build system prompt with enrichment context."""
    gate_color = "unknown"
    health_score = 0.0
    pass_count = fail_count = review_count = 0
    open_patches = 0

    if ctx.gate_state:
        gate_color = ctx.gate_state.gate_color
        health_score = ctx.gate_state.health_score
    if ctx.field_summary:
        pass_count = ctx.field_summary.pass_count
        fail_count = ctx.field_summary.fail_count
        review_count = ctx.field_summary.review_count
    if ctx.patch_summary:
        open_patches = ctx.patch_summary.open

    return OTTO_SYSTEM_PROMPT.format(
        voice_baseline=OTTO_VOICE_BASELINE,
        max_tool_calls=OTTO_CALIBRATION["otto.max_tool_calls"],
        vault_id=ctx.vault_id,
        gate_color=gate_color,
        health_score=health_score,
        pass_count=pass_count,
        fail_count=fail_count,
        review_count=review_count,
        open_patches=open_patches,
        user_role=ctx.user_role,
    )


OTTO_AGENT_SYSTEM_PROMPT = """\
{voice_baseline}

Behavioral rules:
- Propose patches as drafts (never auto-apply)
- Self-approval is blocked (AI-drafted patches need different user approval)
- Maximum {max_tool_calls} tool calls per message

## User Identity
- User: {user_id} (org role: {org_role}, module role: {module_role})
- Module: {module} — Chamber: {chamber}
- Vault: {vault_id}
{persona_block}
## Vault Status
- Gate: {gate_color} (health: {health_score})
- Fields: {pass_count} pass, {fail_count} fail, {review_count} review
- Open patches: {open_patches}

## Tool Authorization
{tool_block}

## Response Style
Respond in a {response_style} manner. {style_guidance}
"""


def build_agent_context_prompt(ctx: UserAgentContext) -> str:
    """Build system prompt with full agent context (identity + capabilities + enrichment)."""
    gate_color = "unknown"
    health_score = 0.0
    pass_count = fail_count = review_count = 0
    open_patches = 0

    vc = ctx.vault_context
    if vc.gate_state:
        gate_color = vc.gate_state.gate_color
        health_score = vc.gate_state.health_score
    if vc.field_summary:
        pass_count = vc.field_summary.pass_count
        fail_count = vc.field_summary.fail_count
        review_count = vc.field_summary.review_count
    if vc.patch_summary:
        open_patches = vc.patch_summary.open

    # Build tool authorization block
    if ctx.permitted_tools:
        tool_lines = []
        for tool in ctx.permitted_tools:
            scope = ", ".join(tool.module_scope) if tool.module_scope else "all"
            tool_lines.append(
                f"- {tool.name} ({tool.server}) — risk: {tool.risk_tier}, scope: {scope}"
            )
        tool_block = "\n".join(tool_lines)
    else:
        tool_block = "No external tools authorized for this session."

    # Style guidance based on preference
    style_map = {
        "concise": "Keep answers brief and actionable — bullet points preferred.",
        "detailed": "Provide thorough explanations with examples and reasoning.",
        "technical": "Use precise technical language; include data references and field names.",
    }
    style_guidance = style_map.get(ctx.response_style, style_map["concise"])

    # Build persona block — use adapter fallback if State Service was unreachable
    persona = ctx.persona if ctx.persona else ADAPTER_FALLBACK
    persona_block = _build_persona_block(persona)

    return OTTO_AGENT_SYSTEM_PROMPT.format(
        voice_baseline=OTTO_VOICE_BASELINE,
        max_tool_calls=OTTO_CALIBRATION["otto.max_tool_calls"],
        user_id=ctx.user_id,
        org_role=ctx.org_role,
        module_role=ctx.module_role,
        module=ctx.module,
        chamber=ctx.chamber,
        vault_id=ctx.vault_id,
        persona_block=persona_block,
        gate_color=gate_color,
        health_score=health_score,
        pass_count=pass_count,
        fail_count=fail_count,
        review_count=review_count,
        open_patches=open_patches,
        tool_block=tool_block,
        response_style=ctx.response_style,
        style_guidance=style_guidance,
    )


def generate_stub_response(message: str, ctx: VaultContext) -> str:
    """Generate structured stub response when AI is unavailable.

    Uses enrichment context to produce useful output even without LLM.
    """
    parts = ["**Otto Analysis** (enrichment-only mode)\n"]

    if ctx.gate_state:
        parts.append(
            f"**Gate Status:** {ctx.gate_state.gate_color.upper()} "
            f"— Health: {ctx.gate_state.health_score:.0%}"
        )

    if ctx.field_summary:
        fs = ctx.field_summary
        total = fs.pass_count + fs.fail_count + fs.review_count + fs.skip_count
        parts.append(
            f"**Fields:** {fs.pass_count}/{total} passing, "
            f"{fs.fail_count} failures, {fs.review_count} need review"
        )

    if ctx.patch_summary:
        ps = ctx.patch_summary
        parts.append(
            f"**Patches:** {ps.open} open, {ps.in_review} in review, {ps.resolved} resolved"
        )

    if ctx.contract_health:
        parts.append(
            f"**Contract Health:** {ctx.contract_health.score:.0%} "
            f"({ctx.contract_health.total_checks} checks)"
        )

    if ctx.preflight_sections:
        statuses = ", ".join(f"{s.name}: {s.status}" for s in ctx.preflight_sections)
        parts.append(f"**Preflight:** {statuses}")

    if ctx.deal_fields:
        df = ctx.deal_fields
        fields = []
        if df.territory:
            fields.append(f"Territory: {df.territory}")
        if df.contract_type:
            fields.append(f"Type: {df.contract_type}")
        if df.term_length:
            fields.append(f"Term: {df.term_length}")
        if fields:
            parts.append(f"**Deal:** {', '.join(fields)}")

    if not any([ctx.gate_state, ctx.field_summary, ctx.patch_summary]):
        parts.append("No enrichment data available for this vault.")

    parts.append(
        "\n*AI model unavailable — showing enrichment summary. "
        "Full analysis will resume when the model is online.*"
    )

    return "\n\n".join(parts)
