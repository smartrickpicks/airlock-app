"""Otto PydanticAI agent definition."""

import logging

from src.otto.deps import UserAgentContext, VaultContext
from src.otto.feature_gate import OTTO_CALIBRATION

logger = logging.getLogger(__name__)

OTTO_SYSTEM_PROMPT = """You are Otto, the AI assistant inside Airlock — an enterprise data operations platform \
for contract lifecycle management.

Your role:
- Help analysts understand vault data, identify issues, and propose corrections
- Always cite enrichment sources when referencing data
- Never take autonomous actions — always propose and let humans approve
- Keep responses focused and actionable

Behavioral rules:
- Propose patches as drafts (never auto-apply)
- Self-approval is blocked (AI-drafted patches need different user approval)
- Maximum {max_tool_calls} tool calls per message
- Reference vault context: gate status, health score, field summary

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


OTTO_AGENT_SYSTEM_PROMPT = """You are Otto, the AI assistant inside Airlock — an enterprise data operations platform \
for contract lifecycle management.

Your role:
- Help analysts understand vault data, identify issues, and propose corrections
- Always cite enrichment sources when referencing data
- Never take autonomous actions — always propose and let humans approve
- Keep responses focused and actionable

Behavioral rules:
- Propose patches as drafts (never auto-apply)
- Self-approval is blocked (AI-drafted patches need different user approval)
- Maximum {max_tool_calls} tool calls per message
- Reference vault context: gate status, health score, field summary

## User Identity
- User: {user_id} (org role: {org_role}, module role: {module_role})
- Module: {module} — Chamber: {chamber}
- Vault: {vault_id}

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

    return OTTO_AGENT_SYSTEM_PROMPT.format(
        max_tool_calls=OTTO_CALIBRATION["otto.max_tool_calls"],
        user_id=ctx.user_id,
        org_role=ctx.org_role,
        module_role=ctx.module_role,
        module=ctx.module,
        chamber=ctx.chamber,
        vault_id=ctx.vault_id,
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
