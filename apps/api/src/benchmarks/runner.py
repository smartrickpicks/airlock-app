"""ConstellationBench council runner — dispatches LLM calls and collects perspectives."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time

import httpx

from src.benchmarks.config import COUNCILS, ModelTier
from src.benchmarks.corpus import BenchmarkQuery
from src.benchmarks.models import CouncilRunResult, Perspective

logger = logging.getLogger(__name__)

STATE_SERVICE = "http://localhost:8100"

COUNCIL_PROMPT = """# Constellation Council — {persona_name} Perspective

You are **{persona_name}** ({persona_emoji}), a member of Otto's constellation council.

## Your Behavioral Profile

- **Category:** {category}
- **Drives:** D:{d} E:{e} C:{c} F:{f}
- **Primary traits:** {traits}

## Your Role on This Council

You are the **{role}** on this council. The command type is **{command}** ({chamber} chamber).

## Briefing

{briefing}

## The Query

{query}

## Your Task

Respond with EXACTLY this JSON structure (no markdown, no commentary outside the JSON):

```json
{{
  "persona": "{persona_id}",
  "position": "2-3 sentences stating your position on the query, in character",
  "conviction": 7.5,
  "concerns": ["specific concern 1", "specific concern 2"],
  "opportunities": ["specific opportunity 1", "specific opportunity 2"],
  "recommends_action": true
}}
```

Rules:
- **Stay in character.** Your DECF drives shape how you see the world.
- **Be specific.** Reference concrete technologies, patterns, or risks.
- **Conviction is 1-10.** 1 = strongly against, 5 = neutral, 10 = strongly for.
- **Concerns and opportunities must be concrete**, not generic platitudes.
- **recommends_action** = true if you think action is warranted, false if informational."""

PERSONA_EMOJI: dict[str, str] = {
    "captain": "\U0001f396\ufe0f",
    "scholar": "\U0001f4da",
    "strategist": "\u265f\ufe0f",
    "maverick": "\U0001f525",
    "venturer": "\U0001f3d4\ufe0f",
    "individualist": "\U0001f52c",
    "guardian": "\U0001f6e1\ufe0f",
    "analyzer": "\U0001f4ca",
    "controller": "\u2699\ufe0f",
    "operator": "\U0001f527",
    "artisan": "\U0001f3a8",
    "persuader": "\U0001f3a4",
    "adapter": "\U0001f504",
    "altruist": "\U0001f49b",
    "collaborator": "\U0001f91d",
    "promoter": "\U0001f4e3",
    "specialist": "\U0001f3af",
}


class CouncilRunner:
    """Runs a constellation council query against a specific model tier."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self._profiles_cache: dict[str, dict] = {}

    async def fetch_profile(self, persona_id: str) -> dict:
        """Fetch persona profile from State Service, with caching."""
        if persona_id in self._profiles_cache:
            return self._profiles_cache[persona_id]

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{STATE_SERVICE}/persona/profiles/{persona_id}")
            resp.raise_for_status()
            profile = resp.json()
            self._profiles_cache[persona_id] = profile
            return profile

    def compose_prompt(
        self,
        profile: dict,
        query: BenchmarkQuery,
        role: str,
        command: str,
    ) -> str:
        """Compose the council prompt for a single persona."""
        drives = profile.get("drives", {})
        strengths = profile.get("strengths", [])
        traits = ", ".join(strengths[:3]) if strengths else "general capability"

        council = COUNCILS.get(command, {})
        chamber = council.get("chamber", command.title())

        return COUNCIL_PROMPT.format(
            persona_name=profile.get("name", profile["id"]),
            persona_emoji=PERSONA_EMOJI.get(profile["id"], "\U0001f535"),
            category=profile.get("category", "unknown"),
            d=drives.get("dominance", 5),
            e=drives.get("extraversion", 5),
            c=drives.get("patience", 5),
            f=drives.get("formality", 5),
            traits=traits,
            role=role,
            command=command,
            chamber=chamber,
            briefing=query.briefing,
            query=query.query,
            persona_id=profile["id"],
        )

    def parse_perspective(self, raw: str, persona_id: str) -> Perspective:
        """Parse LLM response into a Perspective, handling invalid JSON."""
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        json_str = json_match.group(1) if json_match else raw.strip()

        if not json_match:
            brace_match = re.search(r"\{.*\}", raw, re.DOTALL)
            if brace_match:
                json_str = brace_match.group(0)

        try:
            data = json.loads(json_str)
            return Perspective(
                persona=data.get("persona", persona_id),
                position=data.get("position", ""),
                conviction=float(data.get("conviction", 5.0)),
                concerns=data.get("concerns", []),
                opportunities=data.get("opportunities", []),
                recommends_action=data.get("recommends_action", False),
                raw_response=raw,
                json_valid=True,
            )
        except (json.JSONDecodeError, ValueError):
            return Perspective(
                persona=persona_id,
                position=raw[:500],
                conviction=5.0,
                concerns=[],
                opportunities=[],
                recommends_action=False,
                raw_response=raw,
                json_valid=False,
            )

    async def call_llm(
        self,
        prompt: str,
        model_tier: ModelTier,
    ) -> tuple[str, int, int, int]:
        """Call the LLM via OpenRouter-compatible API.

        Returns (response_text, input_tokens, output_tokens, latency_ms).
        """
        start = time.monotonic()

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if model_tier.provider == "openrouter":
            headers["HTTP-Referer"] = "https://brainbrigade.xyz"
            headers["X-Title"] = "ConstellationBench"

        payload = {
            "model": model_tier.model_id,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": model_tier.max_tokens,
            "temperature": 0.7,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{model_tier.base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        latency_ms = int((time.monotonic() - start) * 1000)
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return (
            text,
            usage.get("prompt_tokens", 0),
            usage.get("completion_tokens", 0),
            latency_ms,
        )

    async def run_council(
        self,
        query: BenchmarkQuery,
        model_tier: ModelTier,
    ) -> CouncilRunResult:
        """Run a full council for one (query, model_tier) combination."""
        council = COUNCILS.get(query.command)
        if not council:
            return CouncilRunResult(
                query_id=query.id,
                query_text=query.query,
                command=query.command,
                model_tier=model_tier.name,
                model_id=model_tier.model_id,
                errors=[f"Unknown command: {query.command}"],
            )

        result = CouncilRunResult(
            query_id=query.id,
            query_text=query.query,
            command=query.command,
            model_tier=model_tier.name,
            model_id=model_tier.model_id,
            council_config=council,
        )

        try:
            profiles = await asyncio.gather(
                *[self.fetch_profile(pid) for pid in council["members"]]
            )
        except Exception as e:
            result.errors.append(f"Failed to fetch profiles: {e}")
            return result

        prompts: list[tuple[str, str]] = []
        for profile in profiles:
            pid = profile["id"]
            role = "Lead" if pid == council["lead"] else "Council Member"
            prompt = self.compose_prompt(profile, query, role, query.command)
            prompts.append((pid, prompt))

        async def call_one(persona_id: str, prompt: str) -> Perspective:
            try:
                text, in_tok, out_tok, latency = await self.call_llm(prompt, model_tier)
                perspective = self.parse_perspective(text, persona_id)
                perspective.input_tokens = in_tok
                perspective.output_tokens = out_tok
                perspective.latency_ms = latency
                return perspective
            except Exception as e:
                logger.error("LLM call failed for %s: %s", persona_id, e)
                return Perspective(
                    persona=persona_id,
                    position=f"Error: {e}",
                    conviction=0.0,
                    concerns=[],
                    opportunities=[],
                    recommends_action=False,
                    raw_response=str(e),
                    json_valid=False,
                )

        perspectives = await asyncio.gather(*[call_one(pid, prompt) for pid, prompt in prompts])

        result.perspectives = list(perspectives)
        result.total_input_tokens = sum(p.input_tokens for p in perspectives)
        result.total_output_tokens = sum(p.output_tokens for p in perspectives)
        result.total_latency_ms = max((p.latency_ms for p in perspectives), default=0)
        result.total_cost_usd = (
            result.total_input_tokens / 1000 * model_tier.cost_per_1k_input
        ) + (result.total_output_tokens / 1000 * model_tier.cost_per_1k_output)

        return result
