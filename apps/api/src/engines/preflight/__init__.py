"""Preflight Engine — Document quality gates and field extraction.

Ported from OrcestrateOS server/preflight_engine.py (3,908 LOC).
Split into focused modules for maintainability.
"""

from .engine import run_preflight

__all__ = ["run_preflight"]
