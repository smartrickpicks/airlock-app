"""Tests for the ConstellationBench council runner."""

import pytest

from src.benchmarks.corpus import CORPUS
from src.benchmarks.runner import CouncilRunner


@pytest.mark.asyncio
async def test_runner_composes_prompt():
    """Runner should compose a valid prompt from persona profile + query."""
    runner = CouncilRunner(api_key="test-key")
    profile = {
        "id": "scholar",
        "name": "Scholar",
        "category": "analytical",
        "drives": {"dominance": 3, "extraversion": 2, "patience": 7, "formality": 8},
        "strengths": ["Deep expertise"],
    }
    prompt = runner.compose_prompt(
        profile=profile,
        query=CORPUS[0],
        role="Lead",
        command="discover",
    )
    assert "Scholar" in prompt
    assert "D:3" in prompt
    assert "Lead" in prompt
    assert CORPUS[0].query in prompt


@pytest.mark.asyncio
async def test_runner_parses_valid_json():
    """Runner should parse valid JSON perspective from LLM response."""
    runner = CouncilRunner(api_key="test-key")
    raw = '{"persona":"scholar","position":"test","conviction":7.5,"concerns":["a"],"opportunities":["b"],"recommends_action":true}'
    perspective = runner.parse_perspective(raw, "scholar")
    assert perspective.persona == "scholar"
    assert perspective.conviction == 7.5
    assert perspective.json_valid is True


@pytest.mark.asyncio
async def test_runner_handles_invalid_json():
    """Runner should gracefully handle non-JSON LLM responses."""
    runner = CouncilRunner(api_key="test-key")
    raw = "I think we should focus on..."
    perspective = runner.parse_perspective(raw, "scholar")
    assert perspective.json_valid is False
    assert perspective.persona == "scholar"
