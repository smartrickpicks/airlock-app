"""Otto feature gate — circuit breaker + feature flag checks."""

import logging
import time

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Simple circuit breaker for Otto AI."""

    def __init__(
        self,
        error_threshold: int = 5,
        window_seconds: int = 60,
        cooldown_seconds: int = 300,
    ):
        self.error_threshold = error_threshold
        self.window_seconds = window_seconds
        self.cooldown_seconds = cooldown_seconds
        self._errors: list[float] = []
        self._tripped_at: float | None = None

    @property
    def is_open(self) -> bool:
        """True if circuit is open (too many errors)."""
        if self._tripped_at is not None:
            if time.time() - self._tripped_at > self.cooldown_seconds:
                self._tripped_at = None
                self._errors.clear()
                logger.info("Circuit breaker recovered")
                return False
            return True
        return False

    def record_error(self) -> None:
        """Record an error and trip if threshold exceeded."""
        now = time.time()
        self._errors = [t for t in self._errors if now - t < self.window_seconds]
        self._errors.append(now)
        if len(self._errors) >= self.error_threshold:
            self._tripped_at = now
            logger.warning(
                "Circuit breaker tripped: %d errors in %ds",
                len(self._errors),
                self.window_seconds,
            )

    def record_success(self) -> None:
        """Record a success (no-op for now)."""

    def reset(self) -> None:
        """Manual reset."""
        self._errors.clear()
        self._tripped_at = None


# Global instance
otto_circuit_breaker = CircuitBreaker()

# Feature flags (hardcoded defaults — will be DB-driven later)
OTTO_FEATURE_FLAGS: dict[str, bool] = {
    "otto.enabled": True,
    "otto.tools_enabled": True,
    "otto.streaming_enabled": True,
}

OTTO_CALIBRATION: dict[str, int | float | str] = {
    "otto.model": "otto-default",
    "otto.max_tokens": 2048,
    "otto.temperature": 0.3,
    "otto.timeout": 30,
    "otto.enrichment_timeout": 2,
    "otto.max_tool_calls": 5,
}


def is_otto_enabled() -> bool:
    """Check if Otto is enabled and circuit breaker is not open."""
    return OTTO_FEATURE_FLAGS.get("otto.enabled", True) and not otto_circuit_breaker.is_open


# ─── Execution Tier Config ───────────────────────────────────────────

from dataclasses import dataclass, field  # noqa: E402


@dataclass
class TierSettings:
    """Settings for a single execution tier."""

    enabled: bool = False
    provider: str = ""
    model: str = ""
    base_url: str = ""
    max_tokens: int = 512
    confidence_threshold: float = 0.85


@dataclass
class ExecutionTierConfig:
    """Feature-flagged execution tiers per workspace."""

    tiers: dict[str, TierSettings] = field(default_factory=dict)
    fallback_order: list[str] = field(default_factory=list)


def default_tier_config() -> ExecutionTierConfig:
    """Default config: deterministic + cloud, no local."""
    return ExecutionTierConfig(
        tiers={
            "deterministic": TierSettings(
                enabled=True,
                confidence_threshold=0.85,
            ),
            "local_llm": TierSettings(
                enabled=False,
                provider="ollama",
                model="mistral:7b-instruct",
                base_url="http://localhost:11434",
                max_tokens=512,
            ),
            "cloud_llm": TierSettings(
                enabled=True,
                provider="anthropic",
                model="claude-sonnet-4-6",
                max_tokens=2048,
            ),
        },
        fallback_order=["deterministic", "local_llm", "cloud_llm"],
    )


def validate_tier_config(config: ExecutionTierConfig) -> list[str]:
    """Validate tier config. Returns list of errors/warnings."""
    errors: list[str] = []
    enabled = [t for t in config.fallback_order if config.tiers[t].enabled]

    if not enabled:
        errors.append("At least one execution tier must be enabled")

    if config.tiers["local_llm"].enabled and not config.tiers["local_llm"].base_url:
        errors.append("Local LLM enabled but no base_url configured")

    if enabled == ["deterministic"]:
        errors.append(
            "WARN: Only deterministic tier enabled — Otto will not respond to freeform questions"
        )

    return errors
