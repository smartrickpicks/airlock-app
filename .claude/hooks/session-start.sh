#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote environment)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# --- JS workspace (apps/web, packages/*) ---
pnpm install

# --- Python API (apps/api) ---
# Use a venv to isolate from Debian-managed system packages (no RECORD files)
if [ ! -d apps/api/.venv ]; then
  python3 -m venv apps/api/.venv
fi
# shellcheck source=/dev/null
source apps/api/.venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -e "apps/api[dev]"

# Persist VIRTUAL_ENV so the rest of the session uses it
echo "export VIRTUAL_ENV=$CLAUDE_PROJECT_DIR/apps/api/.venv" >> "$CLAUDE_ENV_FILE"
echo "export PATH=$CLAUDE_PROJECT_DIR/apps/api/.venv/bin:\$PATH" >> "$CLAUDE_ENV_FILE"

