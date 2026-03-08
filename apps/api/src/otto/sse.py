"""SSE formatting helpers — Vercel AI SDK wire format."""

import json


def format_sse_text(delta: str) -> str:
    """Text delta: 0:"token text" """
    return f"0:{json.dumps(delta)}\n"


def format_sse_tool_call(tool_call_id: str, tool_name: str, args: dict) -> str:
    """Tool call: 2:[{toolCallId, toolName, args}]"""
    payload = [{"toolCallId": tool_call_id, "toolName": tool_name, "args": args}]
    return f"2:{json.dumps(payload)}\n"


def format_sse_tool_result(tool_call_id: str, result: str) -> str:
    """Tool result: 8:[{toolCallId, result}]"""
    payload = [{"toolCallId": tool_call_id, "result": result}]
    return f"8:{json.dumps(payload)}\n"


def format_sse_finish(reason: str, prompt_tokens: int, completion_tokens: int) -> str:
    """Finish: e:{finishReason, usage}"""
    payload = {
        "finishReason": reason,
        "usage": {"promptTokens": prompt_tokens, "completionTokens": completion_tokens},
    }
    return f"e:{json.dumps(payload)}\n"


def format_sse_done() -> str:
    """Done signal: d:[DONE]"""
    return "d:[DONE]\n"


def format_sse_error(message: str) -> str:
    """Error: 3:{error}"""
    return f"3:{json.dumps(message)}\n"
