"""Tests for SSE event formatting — Task 3.2."""

import json

from src.otto.sse import (
    format_sse_done,
    format_sse_node_advance,
    format_sse_signal_push,
    format_sse_text,
    format_sse_tier_info,
    format_sse_tool_start,
)


def test_existing_text_format():
    result = format_sse_text("hello")
    assert result == '0:"hello"\n'


def test_existing_done_format():
    result = format_sse_done()
    assert result == "d:[DONE]\n"


def test_node_advance_format():
    result = format_sse_node_advance(from_index=2, to_index=3, node={"type": "review"})
    assert result.startswith("9:")
    data = json.loads(result[2:].strip())
    assert data["from"] == 2
    assert data["to"] == 3
    assert data["node"]["type"] == "review"


def test_signal_push_format():
    result = format_sse_signal_push(module="contracts", signal={"type": "health_drop"})
    assert result.startswith("a:")
    data = json.loads(result[2:].strip())
    assert data["module"] == "contracts"
    assert data["signal"]["type"] == "health_drop"


def test_tool_start_format():
    result = format_sse_tool_start("get_field_summary")
    assert result.startswith("b:")
    data = json.loads(result[2:].strip())
    assert data["tool"] == "get_field_summary"


def test_tier_info_format():
    result = format_sse_tier_info("deterministic", "gate_status")
    assert result.startswith("c:")
    data = json.loads(result[2:].strip())
    assert data["tier"] == "deterministic"
    assert data["intent"] == "gate_status"


def test_tier_info_no_intent():
    result = format_sse_tier_info("cloud_llm")
    data = json.loads(result[2:].strip())
    assert data["intent"] is None
