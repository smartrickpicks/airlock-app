"""Tiny CLI harness for the Day-1 imprint flow."""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from inference.imprint_decf import DRIVE_SIGNALS, run_imprint
except ModuleNotFoundError:  # pragma: no cover - supports direct script execution
    from imprint_decf import DRIVE_SIGNALS, run_imprint


ENV_FILE = Path("/Volumes/OttoVault/repos/airlock-config/secrets/.env.constellation")
FIXTURES = {
    "operator": (
        "I want to carefully analyze the data and build a thorough audit trail",
        "Just a second opinion",
        "Read every detail first",
    ),
    "clear_high_e": (
        "Everyone aligned, big launch, let's go!!",
        "Run things for me",
        "Scan summary, then act",
    ),
    "clear_low_e": (
        "I'll handle this independently and quietly",
        "Just a second opinion",
        "Read every detail first",
    ),
}


def _load_env() -> None:
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        clean = line.strip()
        if not clean or clean.startswith("#") or "=" not in clean:
            continue
        key, value = clean.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _choose(label: str, options: list[str]) -> str:
    print(label)
    for i, option in enumerate(options, 1):
        print(f"{i}. {option}")
    raw = input("> ").strip()
    if raw.isdigit() and 1 <= int(raw) <= len(options):
        return options[int(raw) - 1]
    if raw in options:
        return raw
    raise SystemExit(f"Unknown card: {raw}")


def _print_result(q1: str, q2: str, q3: str) -> None:
    result = run_imprint(q1, q2, q3)
    print(json.dumps(asdict(result), indent=2, sort_keys=True))


def _interactive() -> None:
    q1 = input("What are you here to accomplish?\n> ").strip()
    q2 = _choose("How much should MAGS handle on its own?", list(DRIVE_SIGNALS["autonomy_signals"]))
    q3 = _choose("When you get a new report, what do you do first?", list(DRIVE_SIGNALS["report_style_signals"]))
    _print_result(q1, q2, q3)


def main(argv: list[str]) -> int:
    _load_env()
    if argv == ["--interactive"]:
        _interactive()
        return 0
    if len(argv) == 2 and argv[0] == "--fixture":
        if argv[1] not in FIXTURES:
            raise SystemExit(f"Unknown fixture: {argv[1]}")
        _print_result(*FIXTURES[argv[1]])
        return 0
    raise SystemExit("Usage: python inference/imprint_cli.py --interactive | --fixture <name>")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
