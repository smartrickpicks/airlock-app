"""Tests for ChatRequest surface and recipe fields — Task 3.1."""

from src.otto.routes import ChatRequest


def test_chat_request_has_surface():
    req = ChatRequest(message="hello", surface="messenger")
    assert req.surface == "messenger"


def test_chat_request_defaults_to_task_runner():
    req = ChatRequest(message="hello")
    assert req.surface == "task_runner"


def test_chat_request_accepts_recipe_fields():
    req = ChatRequest(
        message="next",
        surface="task_runner",
        recipe_id="rcp_01",
        node_index=2,
    )
    assert req.recipe_id == "rcp_01"
    assert req.node_index == 2


def test_chat_request_recipe_fields_default_none():
    req = ChatRequest(message="hello")
    assert req.recipe_id is None
    assert req.node_index is None
