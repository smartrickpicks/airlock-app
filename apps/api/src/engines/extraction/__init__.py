"""Extraction engine — 6 extractors + dispatcher.

Ported from OrcestrateOS server/extraction/.
"""

from .dispatcher import run_extraction

__all__ = ["run_extraction"]
