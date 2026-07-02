# Config Constellation — Centralized Secrets & Configuration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform airlock-config from a simple MCP registry into the constellation's single source of truth for secrets, environment config, feature flags, platform tiers, and registries.

**Architecture:** A `secrets/` directory with a gitignored `.env.constellation` file holds all API keys. A `manifest.yaml` declares what keys exist, which repos need them, and rotation metadata. An `environments/` directory defines per-environment topology (ports, hosts, CORS). A shell script (`setup.sh`) symlinks or generates per-repo `.env` files from the constellation file. Registries (components, schema) migrate from airlock-docs to airlock-config where agents can write to them.

**Tech Stack:** YAML (manifest, environments, flags), shell script (setup.sh), Python (validation script), dotenv convention

---

## Context for Implementer

### Where things live today

| Config                | Current Location                                                                    | Problem                                                             |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| API keys              | `airlock-app/apps/api/.env`, `apps/web/.env.local`, `airlock-landing/.env.local`    | Scattered across 3 repos, rotation requires touching multiple files |
| LiteLLM model routing | `airlock-config/litellm-config.yaml` AND `airlock-app/apps/api/litellm-config.yaml` | Duplicated — which is canonical?                                    |
| CORS origins          | Hardcoded in `airlock-app/apps/api/src/config.py:38-44`                             | Can't change per environment without code change                    |
| Component registry    | `airlock-docs/registry/components.json`                                             | Agents write here but it's in a docs repo                           |
| Schema registry       | `airlock-docs/registry/schema.json`                                                 | Same — config disguised as docs                                     |
| Feature flags         | Defined in `airlock-docs/specs/feature-control-plane/overview.md` only              | No runtime config, just spec prose                                  |
| Platform tiers        | Defined in specs only                                                               | Not enforceable                                                     |
| Service endpoints     | Hardcoded in `docker-compose.yml`, `config.py`, `next.config.mjs`                   | No single place to see "what runs where"                            |

### Target state

```
airlock-config/
├── registry.json                       ← EXISTS — MCP topology
├── pack-schema.json                    ← EXISTS — Pack format
├── litellm-config.yaml                 ← EXISTS — Model routing (becomes sole copy)
├── capabilities/manifest.yaml          ← EXISTS — Tool detection
├── defaults/content-sources.json       ← EXISTS — Content resolution
├── templates/                          ← EXISTS — Worktree scaffolds
│
├── secrets/
│   ├── manifest.yaml                   ← NEW — Declares all keys, scopes, repos
│   ├── .env.constellation              ← NEW — Gitignored, actual values
│   ├── .env.constellation.example      ← NEW — Committed template
│   └── rotation-runbook.md             ← NEW — When/how to rotate each key
│
├── environments/
│   ├── local.yaml                      ← NEW — Dev topology
│   ├── staging.yaml                    ← NEW — Staging topology
│   └── production.yaml                 ← NEW — Prod topology (no secrets)
│
├── feature-flags/
│   ├── flags.yaml                      ← NEW — Toggle definitions + tier mapping
│   └── calibration.yaml                ← NEW — 32 tunable parameters
│
├── platform/
│   ├── tiers.yaml                      ← NEW — Entitlements per billing tier
│   └── domains.yaml                    ← NEW — CORS, allowed hosts per env
│
├── registries/
│   ├── components.json                 ← MOVED from airlock-docs
│   ├── components.schema.json          ← MOVED from airlock-docs
│   ├── schema.json                     ← MOVED from airlock-docs
│   └── schema.schema.json              ← MOVED from airlock-docs
│
├── scripts/
│   ├── setup.sh                        ← NEW — Symlinks/generates per-repo .env files
│   └── validate.py                     ← NEW — Validates .env.constellation completeness
│
├── CLAUDE.md                           ← UPDATE — New rules for secrets layer
├── AGENTS.md                           ← UPDATE — New MCP write paths
├── README.md                           ← UPDATE — Setup instructions
└── .gitignore                          ← UPDATE — Ignore .env.constellation
```

### Key design decisions

1. **`.env.constellation` is the ONE file** where Zac puts all API keys. Every repo reads from here via symlinks or the setup script.
2. **`manifest.yaml` is the map.** It declares every key, what it's for, which repos need it, when it was last rotated. It's committed (no secret values). Think of it as the "schema" for secrets.
3. **Environment files are topology, not secrets.** `local.yaml` says "postgres runs on localhost:5433", `production.yaml` says "postgres runs on fly-postgres.internal:5432". No keys.
4. **Setup script is the glue.** Run `./scripts/setup.sh` once after clone. It reads `.env.constellation` + the right `environments/*.yaml` and writes per-repo `.env` files.
5. **Registries move to config.** Components and schema registries are configuration that agents modify. They belong in the config hub, not in docs.

---

## Task 1: Secrets Manifest

**Files:**

- Create: `airlock-config/secrets/manifest.yaml`

**Step 1: Create the manifest**

This file declares every secret the constellation needs. No actual values — just metadata.

```yaml
# Airlock Constellation — Secrets Manifest
# This file declares every secret/credential the platform needs.
# Actual values live in .env.constellation (gitignored).
#
# Fields:
#   description  — What this key does
#   provider     — Where to get/rotate it
#   required_by  — Which repos/services need this key
#   rotation     — How often to rotate
#   format       — Expected format (for validation)
#   last_rotated — ISO date of last rotation (update manually)

secrets:
  # ── Auth ────────────────────────────────────────────────────────────────
  JWT_SECRET:
    description: "Signs access and refresh tokens (HS256)"
    provider: "Self-generated: openssl rand -hex 32"
    required_by: [airlock-app/api]
    rotation: "Every 90 days or on suspected compromise"
    format: "hex string, >= 32 chars"
    last_rotated: null

  TOKEN_ENCRYPTION_KEY:
    description: "Fernet key for encrypting stored OAuth tokens"
    provider: 'Self-generated: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
    required_by: [airlock-app/api]
    rotation: "Every 90 days"
    format: "base64-encoded Fernet key"
    last_rotated: null

  GOOGLE_CLIENT_ID:
    description: "Google OAuth client ID for login"
    provider: "https://console.cloud.google.com/apis/credentials"
    required_by: [airlock-app/api, airlock-app/web]
    rotation: "Only on compromise"
    format: "*.apps.googleusercontent.com"
    last_rotated: null

  GOOGLE_CLIENT_SECRET:
    description: "Google OAuth client secret"
    provider: "https://console.cloud.google.com/apis/credentials"
    required_by: [airlock-app/api]
    rotation: "Only on compromise"
    format: "GOCSPX-*"
    last_rotated: null

  # ── AI / LLM ───────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY:
    description: "Claude API key for Otto (via LiteLLM)"
    provider: "https://console.anthropic.com/settings/keys"
    required_by: [airlock-app/api]
    rotation: "Every 90 days"
    format: "sk-ant-*"
    last_rotated: null

  OPENAI_API_KEY:
    description: "GPT-4o fallback for Otto (via LiteLLM)"
    provider: "https://platform.openai.com/api-keys"
    required_by: [airlock-app/api]
    rotation: "Every 90 days"
    format: "sk-*"
    last_rotated: null

  OPENROUTER_API_KEY:
    description: "OpenRouter unified LLM access (Otto direct, landing page)"
    provider: "https://openrouter.ai/keys"
    required_by: [airlock-app/api, airlock-landing]
    rotation: "Every 90 days"
    format: "sk-or-*"
    last_rotated: null

  LITELLM_MASTER_KEY:
    description: "Admin key for LiteLLM gateway"
    provider: "Self-generated: openssl rand -hex 16"
    required_by: [airlock-app/api]
    rotation: "Every 90 days"
    format: "sk-* or hex string"
    last_rotated: null

  # ── Email ───────────────────────────────────────────────────────────────
  RESEND_API_KEY:
    description: "Resend email service for invites and notifications"
    provider: "https://resend.com/api-keys"
    required_by: [airlock-app/api]
    rotation: "Every 90 days"
    format: "re_*"
    last_rotated: null

  # ── Search ──────────────────────────────────────────────────────────────
  MEILI_MASTER_KEY:
    description: "MeiliSearch admin key"
    provider: "Self-generated: openssl rand -hex 16"
    required_by: [airlock-app/api]
    rotation: "Every 90 days"
    format: "hex string"
    last_rotated: null

  # ── Billing ─────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY:
    description: "Stripe API secret key for billing"
    provider: "https://dashboard.stripe.com/apikeys"
    required_by: [airlock-app/api]
    rotation: "Only on compromise"
    format: "sk_live_* or sk_test_*"
    last_rotated: null

  STRIPE_WEBHOOK_SECRET:
    description: "Stripe webhook signature verification"
    provider: "https://dashboard.stripe.com/webhooks"
    required_by: [airlock-app/api]
    rotation: "When webhook endpoint changes"
    format: "whsec_*"
    last_rotated: null

  # ── GIFs ────────────────────────────────────────────────────────────────
  KLIPY_API_KEY:
    description: "Klipy GIF search in chat"
    provider: "https://developers.klipy.com/quickstart"
    required_by: [airlock-app/api]
    rotation: "Only on compromise"
    format: "AI*"
    last_rotated: null
```

**Step 2: Verify**

```bash
cat airlock-config/secrets/manifest.yaml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin); print('Valid YAML')"
```

**Step 3: Commit**

```bash
cd airlock-config
git add secrets/manifest.yaml
git commit -m "feat: add secrets manifest — declares all constellation keys"
```

---

## Task 2: Constellation Environment File

**Files:**

- Create: `airlock-config/secrets/.env.constellation.example`
- Create: `airlock-config/secrets/.env.constellation` (gitignored — Zac fills in real values)
- Modify: `airlock-config/.gitignore`

**Step 1: Update .gitignore**

Add to `airlock-config/.gitignore`:

```
# Secrets — NEVER commit actual values
secrets/.env.constellation
secrets/.env.constellation.local
```

**Step 2: Create the example template**

This is the committed template. Empty values. Comments reference the manifest.

```env
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Airlock Constellation — Environment Secrets                                ║
# ║  Copy to .env.constellation and fill in real values.                        ║
# ║  See manifest.yaml for rotation schedules and provider URLs.                ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# ── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET=
TOKEN_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── AI / LLM ────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
LITELLM_MASTER_KEY=

# ── Email ────────────────────────────────────────────────────────────────────
RESEND_API_KEY=

# ── Search ───────────────────────────────────────────────────────────────────
MEILI_MASTER_KEY=

# ── Billing (leave empty until Stripe account created) ───────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ── Optional ─────────────────────────────────────────────────────────────────
KLIPY_API_KEY=
```

**Step 3: Copy template to actual file (gitignored)**

```bash
cp airlock-config/secrets/.env.constellation.example airlock-config/secrets/.env.constellation
```

Zac fills in real values here after rotating keys.

**Step 4: Commit**

```bash
cd airlock-config
git add .gitignore secrets/.env.constellation.example
git commit -m "feat: add .env.constellation template — single source of truth for all keys"
```

---

## Task 3: Environment Topology Files

**Files:**

- Create: `airlock-config/environments/local.yaml`
- Create: `airlock-config/environments/staging.yaml`
- Create: `airlock-config/environments/production.yaml`

These define WHERE services run — no secrets, just hosts/ports/domains.

**Step 1: Create local.yaml**

```yaml
# Airlock — Local Development Environment
# No secrets here. Only topology: what runs where.

environment: development
debug: true

services:
  postgres:
    host: localhost
    port: 5433
    database: airlock
    user: airlock
    password: airlock # Dev only — not a real secret
  redis:
    host: localhost
    port: 6379
    db: 0
  meilisearch:
    host: localhost
    port: 7700
  litellm:
    host: localhost
    port: 4000
  api:
    host: localhost
    port: 8000
  web:
    host: localhost
    port: 3000
  ollama:
    host: localhost
    port: 11434

cors:
  origins:
    - "http://localhost:3000"
    - "http://localhost:3005"

domains:
  app_url: "http://localhost:3000"
  api_url: "http://localhost:8000"
  rp_id: "localhost"
  rp_name: "Airlock"
  rp_origin: "http://localhost:3000"

email:
  from: "Airlock Dev <noreply@localhost>"
```

**Step 2: Create staging.yaml**

```yaml
# Airlock — Staging Environment

environment: staging
debug: false

services:
  postgres:
    host: "${FLY_POSTGRES_HOST}"
    port: 5432
    database: airlock
  redis:
    host: "${REDIS_HOST}"
    port: 6379
    db: 0
  meilisearch:
    host: "meilisearch.internal"
    port: 7700
  litellm:
    host: "litellm.internal"
    port: 4000
  api:
    host: "0.0.0.0"
    port: 8000

cors:
  origins:
    - "https://staging.brainbrigade.xyz"

domains:
  app_url: "https://staging.brainbrigade.xyz"
  api_url: "https://staging-api.brainbrigade.xyz"
  rp_id: "staging.brainbrigade.xyz"
  rp_name: "Airlock Staging"
  rp_origin: "https://staging.brainbrigade.xyz"

email:
  from: "Airlock Staging <noreply@brainbrigade.xyz>"
```

**Step 3: Create production.yaml**

```yaml
# Airlock — Production Environment

environment: production
debug: false

services:
  postgres:
    host: "${FLY_POSTGRES_HOST}"
    port: 5432
    database: airlock
  redis:
    host: "${REDIS_HOST}"
    port: 6379
    db: 0
  meilisearch:
    host: "meilisearch.internal"
    port: 7700
  litellm:
    host: "litellm.internal"
    port: 4000
  api:
    host: "0.0.0.0"
    port: 8000

cors:
  origins:
    - "https://brainbrigade.xyz"
    - "https://www.brainbrigade.xyz"
    - "https://airlock-api.fly.dev"

domains:
  app_url: "https://brainbrigade.xyz"
  api_url: "https://airlock-api.fly.dev"
  rp_id: "brainbrigade.xyz"
  rp_name: "Brain Brigade"
  rp_origin: "https://brainbrigade.xyz"

email:
  from: "Brain Brigade <noreply@brainbrigade.xyz>"

stripe:
  price_plus: "price_plus_monthly"
  price_constellation: "price_constellation_monthly"
  price_byok_pro: "price_byok_pro_monthly"
```

**Step 4: Commit**

```bash
cd airlock-config
git add environments/
git commit -m "feat: add environment topology files — local, staging, production"
```

---

## Task 4: Setup Script

**Files:**

- Create: `airlock-config/scripts/setup.sh`

This is the glue. Run it once after clone (or after rotating keys). It reads `.env.constellation` and writes per-repo `.env` files.

**Step 1: Create the script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Airlock Constellation — Environment Setup                                  ║
# ║  Reads .env.constellation and generates per-repo .env files.                ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_FILE="$CONFIG_ROOT/secrets/.env.constellation"

# ── Locate constellation root ────────────────────────────────────────────────
# Expect: airlock-config lives alongside other repos in a parent directory
CONSTELLATION_ROOT="$(dirname "$CONFIG_ROOT")"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No color

info()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $1"; }
error() { echo -e "${RED}[setup]${NC} $1" >&2; }

# ── Check secrets file exists ────────────────────────────────────────────────
if [[ ! -f "$SECRETS_FILE" ]]; then
  error ".env.constellation not found at: $SECRETS_FILE"
  echo ""
  echo "  Copy the template and fill in your keys:"
  echo "    cp secrets/.env.constellation.example secrets/.env.constellation"
  echo ""
  echo "  See secrets/manifest.yaml for where to get each key."
  exit 1
fi

# ── Load secrets into associative array ──────────────────────────────────────
declare -A SECRETS
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$key" ]] && continue
  key="$(echo "$key" | xargs)"   # trim whitespace
  value="$(echo "$value" | xargs)"
  SECRETS["$key"]="$value"
done < "$SECRETS_FILE"

info "Loaded ${#SECRETS[@]} keys from .env.constellation"

# ── Helper: write env file ───────────────────────────────────────────────────
write_env() {
  local target="$1"
  shift
  local keys=("$@")

  # Ensure directory exists
  mkdir -p "$(dirname "$target")"

  echo "# Generated by airlock-config/scripts/setup.sh" > "$target"
  echo "# Do not edit — regenerate with: ./scripts/setup.sh" >> "$target"
  echo "# $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$target"
  echo "" >> "$target"

  local missing=0
  for key in "${keys[@]}"; do
    if [[ -n "${SECRETS[$key]:-}" ]]; then
      echo "${key}=${SECRETS[$key]}" >> "$target"
    else
      echo "# ${key}=  # NOT SET — check .env.constellation" >> "$target"
      ((missing++))
    fi
  done

  if [[ $missing -gt 0 ]]; then
    warn "$(basename "$target"): $missing keys not set"
  else
    info "$(basename "$target"): all keys present"
  fi
}

# ── Generate: airlock-app/apps/api/.env ──────────────────────────────────────
API_DIR="$CONSTELLATION_ROOT/airlock-app/apps/api"
if [[ -d "$API_DIR" ]]; then
  # Static config (from local.yaml topology)
  cat > "$API_DIR/.env" <<'STATIC'
# Generated by airlock-config/scripts/setup.sh
# Do not edit — regenerate with: ./scripts/setup.sh

# ── Topology (from environments/local.yaml) ──────────────────────────────
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://airlock:airlock@localhost:5433/airlock
REDIS_URL=redis://localhost:6379/0
MEILI_URL=http://localhost:7700
LITELLM_API_BASE=http://localhost:4000
APP_URL=http://localhost:3000
RP_ID=localhost
RP_NAME=Airlock
RP_ORIGIN=http://localhost:3000
RESEND_FROM_EMAIL=Airlock Dev <noreply@localhost>

STATIC

  # Append secrets
  for key in JWT_SECRET TOKEN_ENCRYPTION_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
             ANTHROPIC_API_KEY OPENAI_API_KEY OPENROUTER_API_KEY LITELLM_MASTER_KEY \
             RESEND_API_KEY MEILI_MASTER_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET \
             KLIPY_API_KEY; do
    if [[ -n "${SECRETS[$key]:-}" ]]; then
      echo "${key}=${SECRETS[$key]}" >> "$API_DIR/.env"
    else
      echo "# ${key}=  # NOT SET" >> "$API_DIR/.env"
    fi
  done

  info "Wrote airlock-app/apps/api/.env"
else
  warn "airlock-app/apps/api/ not found at $API_DIR — skipping"
fi

# ── Generate: airlock-app/apps/web/.env.local ────────────────────────────────
WEB_DIR="$CONSTELLATION_ROOT/airlock-app/apps/web"
if [[ -d "$WEB_DIR" ]]; then
  write_env "$WEB_DIR/.env.local" \
    NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID

  # NEXT_PUBLIC_API_URL isn't a secret — inject static value
  if ! grep -q "NEXT_PUBLIC_API_URL" "$WEB_DIR/.env.local" 2>/dev/null || \
     grep -q "NOT SET" "$WEB_DIR/.env.local" 2>/dev/null; then
    sed -i '' '/NEXT_PUBLIC_API_URL/d' "$WEB_DIR/.env.local" 2>/dev/null || true
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> "$WEB_DIR/.env.local"
  fi

  # Map GOOGLE_CLIENT_ID → NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if [[ -n "${SECRETS[GOOGLE_CLIENT_ID]:-}" ]]; then
    echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=${SECRETS[GOOGLE_CLIENT_ID]}" >> "$WEB_DIR/.env.local"
  fi

  info "Wrote airlock-app/apps/web/.env.local"
else
  warn "airlock-app/apps/web/ not found at $WEB_DIR — skipping"
fi

# ── Generate: airlock-landing/.env.local ─────────────────────────────────────
LANDING_DIR="$CONSTELLATION_ROOT/airlock-landing"
if [[ -d "$LANDING_DIR" ]]; then
  write_env "$LANDING_DIR/.env.local" \
    OPENROUTER_API_KEY

  info "Wrote airlock-landing/.env.local"
else
  warn "airlock-landing/ not found at $LANDING_DIR — skipping"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
info "Setup complete. Generated .env files for all detected repos."
echo ""
echo "  Next steps:"
echo "    1. Fill in any missing keys in secrets/.env.constellation"
echo "    2. Re-run this script after adding keys: ./scripts/setup.sh"
echo "    3. After rotating a key: update .env.constellation, re-run this script"
echo ""
```

**Step 2: Make executable**

```bash
chmod +x airlock-config/scripts/setup.sh
```

**Step 3: Test it**

```bash
cd airlock-config
# First run without .env.constellation — should error with helpful message
./scripts/setup.sh

# Copy template, fill in a test value
cp secrets/.env.constellation.example secrets/.env.constellation
echo "JWT_SECRET=test-secret-for-validation-only-32chars" >> secrets/.env.constellation
./scripts/setup.sh
```

Expected: Script writes `.env` files to detected repos, warns about missing keys.

**Step 4: Commit**

```bash
cd airlock-config
git add scripts/setup.sh
git commit -m "feat: add setup script — generates per-repo .env from constellation file"
```

---

## Task 5: Validation Script

**Files:**

- Create: `airlock-config/scripts/validate.py`

Reads the manifest and `.env.constellation`, reports missing/malformed keys.

**Step 1: Create the script**

```python
#!/usr/bin/env python3
"""Validate .env.constellation against the secrets manifest.

Checks:
  1. All required keys are present and non-empty
  2. Key formats match expected patterns
  3. Rotation dates are not overdue (> 90 days)
"""

import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).parent
CONFIG_ROOT = SCRIPT_DIR.parent
MANIFEST_PATH = CONFIG_ROOT / "secrets" / "manifest.yaml"
ENV_PATH = CONFIG_ROOT / "secrets" / ".env.constellation"

# ANSI colors
RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
NC = "\033[0m"


def load_manifest() -> dict:
    with open(MANIFEST_PATH) as f:
        data = yaml.safe_load(f)
    return data.get("secrets", {})


def load_env() -> dict:
    env = {}
    if not ENV_PATH.exists():
        return env
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


FORMAT_PATTERNS = {
    "sk-ant-*": r"^sk-ant-",
    "sk-or-*": r"^sk-or-",
    "sk-*": r"^sk-",
    "GOCSPX-*": r"^GOCSPX-",
    "*.apps.googleusercontent.com": r"\.apps\.googleusercontent\.com$",
    "re_*": r"^re_",
    "sk_live_* or sk_test_*": r"^sk_(live|test)_",
    "whsec_*": r"^whsec_",
    "AI*": r"^AI",
}


def validate() -> int:
    manifest = load_manifest()
    env = load_env()
    issues = 0

    if not env:
        print(f"{RED}[FAIL]{NC} .env.constellation not found or empty")
        print(f"       Copy the template: cp secrets/.env.constellation.example secrets/.env.constellation")
        return 1

    print(f"Validating {len(manifest)} keys from manifest against .env.constellation\n")

    for key, meta in manifest.items():
        fmt = meta.get("format", "")
        rotation = meta.get("rotation", "")
        last_rotated = meta.get("last_rotated")

        # Check presence
        if key not in env or not env[key]:
            print(f"{YELLOW}[WARN]{NC} {key}: not set")
            issues += 1
            continue

        # Check format
        value = env[key]
        matched = False
        for pattern_label, regex in FORMAT_PATTERNS.items():
            if pattern_label in fmt:
                if re.search(regex, value):
                    matched = True
                    break
        if fmt and not matched and fmt not in ("hex string", "hex string, >= 32 chars", "base64-encoded Fernet key"):
            # Only warn for known pattern formats that didn't match
            for pattern_label in FORMAT_PATTERNS:
                if pattern_label in fmt:
                    print(f"{YELLOW}[WARN]{NC} {key}: format mismatch (expected {fmt})")
                    issues += 1
                    break
            else:
                print(f"{GREEN}[ OK ]{NC} {key}")
        else:
            print(f"{GREEN}[ OK ]{NC} {key}")

        # Check rotation
        if last_rotated and "90 days" in rotation:
            try:
                rotated_date = datetime.fromisoformat(str(last_rotated))
                if datetime.now() - rotated_date > timedelta(days=90):
                    print(f"{YELLOW}      └─ rotation overdue (last: {last_rotated}){NC}")
                    issues += 1
            except (ValueError, TypeError):
                pass

    print()
    if issues == 0:
        print(f"{GREEN}All keys valid.{NC}")
    else:
        print(f"{YELLOW}{issues} issue(s) found.{NC}")
    return 1 if issues > 0 else 0


if __name__ == "__main__":
    sys.exit(validate())
```

**Step 2: Test it**

```bash
cd airlock-config
python3 scripts/validate.py
```

Expected: Reports which keys are set vs missing, format warnings.

**Step 3: Commit**

```bash
cd airlock-config
git add scripts/validate.py
git commit -m "feat: add validation script — checks .env.constellation against manifest"
```

---

## Task 6: Rotation Runbook

**Files:**

- Create: `airlock-config/secrets/rotation-runbook.md`

**Step 1: Create the runbook**

````markdown
# Secret Rotation Runbook

## When to Rotate

- **Scheduled:** Every 90 days for API keys
- **Immediate:** On suspected compromise, employee departure, or key exposure in logs/git

## Rotation Steps

### 1. Generate/Get New Key

| Key                     | How to Rotate                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| JWT_SECRET              | `openssl rand -hex 32`                                                                              |
| TOKEN_ENCRYPTION_KEY    | `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`        |
| GOOGLE_CLIENT_ID/SECRET | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create new OAuth client |
| ANTHROPIC_API_KEY       | [Anthropic Console](https://console.anthropic.com/settings/keys) → Create new key                   |
| OPENAI_API_KEY          | [OpenAI Platform](https://platform.openai.com/api-keys) → Create new key                            |
| OPENROUTER_API_KEY      | [OpenRouter Keys](https://openrouter.ai/keys) → Create new key                                      |
| LITELLM_MASTER_KEY      | `openssl rand -hex 16`                                                                              |
| RESEND_API_KEY          | [Resend Dashboard](https://resend.com/api-keys) → Create new key                                    |
| MEILI_MASTER_KEY        | `openssl rand -hex 16`                                                                              |
| STRIPE_SECRET_KEY       | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) → Roll key                                 |
| STRIPE_WEBHOOK_SECRET   | [Stripe Webhooks](https://dashboard.stripe.com/webhooks) → Roll secret                              |

### 2. Update .env.constellation

```bash
# Edit the single source of truth
nano airlock-config/secrets/.env.constellation
```
````

### 3. Regenerate Per-Repo Files

```bash
cd airlock-config
./scripts/setup.sh
```

### 4. Update manifest.yaml

Set `last_rotated` to today's date for the rotated key.

### 5. Validate

```bash
python3 scripts/validate.py
```

### 6. Test

Restart services and verify they connect:

```bash
# API
cd airlock-app/apps/api && uvicorn src.main:app --reload
# Web
cd airlock-app/apps/web && pnpm dev
```

### 7. Revoke Old Key

Go back to the provider dashboard and **delete the old key**. Don't skip this.

## Post-Compromise Checklist

If a key was exposed in git history or logs:

1. [ ] Rotate the key immediately (steps above)
2. [ ] Scrub git history if needed: `git filter-repo --path-glob '*.env*' --invert-paths`
3. [ ] Check provider dashboard for unauthorized usage
4. [ ] Update `last_rotated` in manifest.yaml
5. [ ] Notify team if shared credentials were affected

````

**Step 2: Commit**

```bash
cd airlock-config
git add secrets/rotation-runbook.md
git commit -m "docs: add secret rotation runbook"
````

---

## Task 7: Feature Flags Configuration

**Files:**

- Create: `airlock-config/feature-flags/flags.yaml`
- Create: `airlock-config/feature-flags/calibration.yaml`

These extract the 27 flags and 32 calibration params from the spec into runtime-configurable YAML.

**Step 1: Create flags.yaml**

```yaml
# Airlock Feature Flags
# Source of truth for feature toggles across the constellation.
# Tier mapping: which billing tier gets which features.

flags:
  # ── Billing & Payments ──────────────────────────────────────────────────
  billing:
    description: "Stripe billing integration"
    default: false
    tiers: [team, enterprise]

  # ── AI / Otto ───────────────────────────────────────────────────────────
  otto_chat:
    description: "Otto AI chat panel in shell"
    default: true
    tiers: [beta, starter, team, enterprise]

  otto_enrichment:
    description: "MAGS enrichment (9-source context assembly)"
    default: true
    tiers: [starter, team, enterprise]

  otto_deep:
    description: "Otto deep thinking mode (Opus model)"
    default: false
    tiers: [team, enterprise]

  otto_playbooks:
    description: "Automated multi-step playbook execution"
    default: false
    tiers: [team, enterprise]

  byok:
    description: "Bring Your Own Key — user-provided API keys"
    default: false
    tiers: [starter, team, enterprise]

  # ── Modules ─────────────────────────────────────────────────────────────
  contracts:
    description: "Contracts module"
    default: true
    tiers: [beta, starter, team, enterprise]

  crm:
    description: "CRM module"
    default: true
    tiers: [beta, starter, team, enterprise]

  triage:
    description: "Triage (project management) module"
    default: true
    tiers: [beta, starter, team, enterprise]

  calendar:
    description: "Calendar module"
    default: false
    tiers: [team, enterprise]

  documents:
    description: "Documents module"
    default: false
    tiers: [team, enterprise]

  # ── Extraction & Processing ─────────────────────────────────────────────
  extraction_engine:
    description: "OrcestrateOS extraction engine (442 fields)"
    default: false
    tiers: [team, enterprise]

  preflight_engine:
    description: "Quality gate preflight checks"
    default: false
    tiers: [team, enterprise]

  generation_engine:
    description: "Contract clause generation"
    default: false
    tiers: [enterprise]

  # ── Collaboration ───────────────────────────────────────────────────────
  real_time:
    description: "WebSocket real-time updates"
    default: true
    tiers: [beta, starter, team, enterprise]

  messenger:
    description: "In-app messaging"
    default: true
    tiers: [beta, starter, team, enterprise]

  reactions:
    description: "Message reactions"
    default: true
    tiers: [beta, starter, team, enterprise]

  # ── Admin ───────────────────────────────────────────────────────────────
  white_label:
    description: "Custom branding, domain, logo"
    default: false
    tiers: [enterprise]

  audit_log:
    description: "Full audit trail"
    default: false
    tiers: [team, enterprise]

  sso:
    description: "SAML/OIDC single sign-on"
    default: false
    tiers: [enterprise]

  # ── Search ──────────────────────────────────────────────────────────────
  full_text_search:
    description: "MeiliSearch full-text across vaults"
    default: false
    tiers: [team, enterprise]

  # ── Marketplace ─────────────────────────────────────────────────────────
  marketplace:
    description: "Maverick Marketplace — install packs, skills, playbooks"
    default: false
    tiers: [team, enterprise]
```

**Step 2: Create calibration.yaml**

```yaml
# Airlock Calibration Parameters
# Tunable thresholds and weights — adjustable per workspace without code changes.

calibration:
  # ── Extraction ──────────────────────────────────────────────────────────
  extraction_confidence_threshold:
    description: "Minimum confidence to auto-accept an extracted field"
    default: 0.85
    range: [0.0, 1.0]
    unit: probability

  extraction_review_threshold:
    description: "Below this confidence, flag for human review"
    default: 0.60
    range: [0.0, 1.0]
    unit: probability

  # ── Risk Scoring ────────────────────────────────────────────────────────
  clause_risk_critical_threshold:
    description: "Score above which a clause is flagged Critical"
    default: 0.90
    range: [0.0, 1.0]
    unit: probability

  clause_risk_elevated_threshold:
    description: "Score above which a clause is flagged Elevated"
    default: 0.70
    range: [0.0, 1.0]
    unit: probability

  # ── Preflight ───────────────────────────────────────────────────────────
  preflight_pass_threshold:
    description: "Minimum quality score to pass preflight gate"
    default: 0.80
    range: [0.0, 1.0]
    unit: probability

  preflight_max_warnings:
    description: "Maximum warnings before auto-failing preflight"
    default: 10
    range: [0, 100]
    unit: count

  # ── Identity Resolution ─────────────────────────────────────────────────
  entity_match_threshold:
    description: "Fuzzy match score for entity deduplication"
    default: 0.85
    range: [0.0, 1.0]
    unit: similarity

  # ── Otto / AI ───────────────────────────────────────────────────────────
  otto_max_tokens:
    description: "Max output tokens for Otto default responses"
    default: 4096
    range: [256, 16384]
    unit: tokens

  otto_temperature:
    description: "LLM temperature for Otto responses"
    default: 0.3
    range: [0.0, 2.0]
    unit: temperature

  otto_context_window:
    description: "Max context tokens assembled by MAGS"
    default: 8192
    range: [1024, 32768]
    unit: tokens

  # ── Health Scoring ──────────────────────────────────────────────────────
  renewal_green_threshold:
    description: "Health score above which renewal is Green (auto-renew)"
    default: 0.80
    range: [0.0, 1.0]
    unit: probability

  renewal_yellow_threshold:
    description: "Health score above which renewal is Yellow (needs engagement)"
    default: 0.50
    range: [0.0, 1.0]
    unit: probability

  # ── SLA / Timing ────────────────────────────────────────────────────────
  gate_sla_hours:
    description: "Default SLA for gate approvals"
    default: 48
    range: [1, 720]
    unit: hours

  vault_stale_days:
    description: "Days without activity before vault is flagged stale"
    default: 14
    range: [1, 365]
    unit: days
```

**Step 3: Commit**

```bash
cd airlock-config
git add feature-flags/
git commit -m "feat: add feature flags and calibration config — 22 flags, 14 tunable params"
```

---

## Task 8: Platform Tiers & Domains

**Files:**

- Create: `airlock-config/platform/tiers.yaml`
- Create: `airlock-config/platform/domains.yaml`

**Step 1: Create tiers.yaml**

```yaml
# Airlock Platform Tiers
# Defines entitlements per billing tier.

tiers:
  beta:
    label: "Beta"
    price_monthly: 0
    max_users: 5
    max_vaults: 50
    max_workspaces: 1
    features:
      - contracts
      - crm
      - triage
      - otto_chat
      - real_time
      - messenger
      - reactions

  starter:
    label: "Starter"
    price_monthly: 29
    max_users: 10
    max_vaults: 200
    max_workspaces: 1
    features:
      - contracts
      - crm
      - triage
      - otto_chat
      - otto_enrichment
      - byok
      - real_time
      - messenger
      - reactions

  team:
    label: "Team"
    price_monthly: 99
    max_users: 50
    max_vaults: 1000
    max_workspaces: 3
    features:
      - contracts
      - crm
      - triage
      - calendar
      - documents
      - otto_chat
      - otto_enrichment
      - otto_deep
      - otto_playbooks
      - byok
      - extraction_engine
      - preflight_engine
      - real_time
      - messenger
      - reactions
      - audit_log
      - full_text_search
      - marketplace

  enterprise:
    label: "Enterprise"
    price_monthly: null # Custom pricing
    max_users: null # Unlimited
    max_vaults: null # Unlimited
    max_workspaces: null # Unlimited
    features: "all" # Every feature enabled
```

**Step 2: Create domains.yaml**

```yaml
# Airlock Domain Configuration
# CORS origins, allowed hosts, and WebAuthn config per environment.
# Referenced by setup.sh when generating per-repo .env files.

domains:
  local:
    cors_origins:
      - "http://localhost:3000"
      - "http://localhost:3005"
    app_url: "http://localhost:3000"
    api_url: "http://localhost:8000"
    rp_id: "localhost"
    rp_origin: "http://localhost:3000"

  staging:
    cors_origins:
      - "https://staging.brainbrigade.xyz"
    app_url: "https://staging.brainbrigade.xyz"
    api_url: "https://staging-api.brainbrigade.xyz"
    rp_id: "staging.brainbrigade.xyz"
    rp_origin: "https://staging.brainbrigade.xyz"

  production:
    cors_origins:
      - "https://brainbrigade.xyz"
      - "https://www.brainbrigade.xyz"
      - "https://airlock-api.fly.dev"
    app_url: "https://brainbrigade.xyz"
    api_url: "https://airlock-api.fly.dev"
    rp_id: "brainbrigade.xyz"
    rp_origin: "https://brainbrigade.xyz"

  # Landing page (separate domain)
  landing:
    cors_origins: []
    app_url: "https://doyoulikedags.xyz"
    docs_url: "https://docs.doyoulikedags.xyz"
```

**Step 3: Commit**

```bash
cd airlock-config
git add platform/
git commit -m "feat: add platform tiers and domain config"
```

---

## Task 9: Move Registries from airlock-docs to airlock-config

**Files:**

- Move: `airlock-docs/registry/components.json` → `airlock-config/registries/components.json`
- Move: `airlock-docs/registry/components.schema.json` → `airlock-config/registries/components.schema.json`
- Move: `airlock-docs/registry/schema.json` → `airlock-config/registries/schema.json`
- Move: `airlock-docs/registry/schema.schema.json` → `airlock-config/registries/schema.schema.json`

**Step 1: Copy files to airlock-config**

```bash
mkdir -p airlock-config/registries

cp airlock-docs/registry/components.json airlock-config/registries/
cp airlock-docs/registry/components.schema.json airlock-config/registries/ 2>/dev/null || true
cp airlock-docs/registry/schema.json airlock-config/registries/
cp airlock-docs/registry/schema.schema.json airlock-config/registries/ 2>/dev/null || true
```

**Step 2: Leave a pointer in airlock-docs**

Replace the files in airlock-docs with a redirect notice:

Create `airlock-docs/registry/README.md`:

```markdown
# Registries — Moved to airlock-config

Component and schema registries have moved to `airlock-config/registries/`.

These are configuration files that agents modify, so they belong in the config hub.

- Components: `airlock-config/registries/components.json`
- Schema: `airlock-config/registries/schema.json`
```

**Step 3: Update airlock-config/registry.json**

Add `writes_to` for airlock-config to include registries:

In `airlock-config/registry.json`, update the airlock-config entry:

```json
"airlock-config": {
  "url": "https://github.com/smartrickpicks/airlock-config",
  "mcp_mode": "read-write-server",
  "description": "MCP registry, pack schema, environment configs, feature flags, registries",
  "reads_from": [],
  "writes_to": ["registries/"]
}
```

Note: MCP mode changes from `read-only-server` to `read-write-server` because agents now write to registries here.

**Step 4: Commit both repos**

```bash
cd airlock-config
git add registries/ registry.json
git commit -m "feat: migrate component and schema registries from airlock-docs"

cd airlock-docs
git add registry/
git commit -m "refactor: move registries to airlock-config — leave pointer"
```

---

## Task 10: Remove Duplicate LiteLLM Config from airlock-app

**Files:**

- Delete: `airlock-app/apps/api/litellm-config.yaml`
- Modify: `airlock-app/docker-compose.yml` — point to airlock-config's copy

**Step 1: Check docker-compose reference**

In `airlock-app/docker-compose.yml`, the litellm service mounts the config:

```yaml
litellm:
  volumes:
    - ./apps/api/litellm-config.yaml:/app/config.yaml
```

Change to:

```yaml
litellm:
  volumes:
    - ../Airlock/repos/airlock-config/litellm-config.yaml:/app/config.yaml
```

Note: For CI/production, litellm-config.yaml would be fetched from the config repo or bundled during deploy. The local path works for dev.

**Step 2: Delete the duplicate**

```bash
cd airlock-app
rm apps/api/litellm-config.yaml
```

**Step 3: Commit**

```bash
cd airlock-app
git add apps/api/litellm-config.yaml docker-compose.yml
git commit -m "refactor: remove duplicate litellm config — canonical copy lives in airlock-config"
```

---

## Task 11: Update CLAUDE.md and README

**Files:**

- Modify: `airlock-config/CLAUDE.md`
- Modify: `airlock-config/README.md`
- Modify: `airlock-config/AGENTS.md`

**Step 1: Update CLAUDE.md**

```markdown
# airlock-config

Meta-configuration layer for the Airlock platform constellation.
Single source of truth for secrets, environments, feature flags, and registries.

## Read First

Read AGENTS.md for your role and boundaries.

## MCP Connections

This repo IS the config hub. It defines how all repos connect and what they can access.

## Rules

- Do NOT modify registry.json without Orchestrator approval
- Do NOT commit actual secret values — .env.constellation is gitignored
- Do NOT modify manifest.yaml without updating .env.constellation.example
- Follow semantic versioning for schema changes
- Feature flag changes require a reason in the commit message
- Registry writes (components.json, schema.json) are allowed by agents

## Key Files

- `secrets/manifest.yaml` — Declares all keys (no values)
- `secrets/.env.constellation` — Actual keys (GITIGNORED)
- `environments/*.yaml` — Per-environment topology
- `feature-flags/flags.yaml` — Feature toggles + tier mapping
- `feature-flags/calibration.yaml` — Tunable parameters
- `platform/tiers.yaml` — Billing tier entitlements
- `registries/` — Component and schema registries (agents write here)
- `registry.json` — MCP constellation topology
- `litellm-config.yaml` — LLM model routing
- `scripts/setup.sh` — Generates per-repo .env files
- `scripts/validate.py` — Validates .env.constellation completeness
```

**Step 2: Update README.md**

````markdown
# airlock-config

Single source of truth for the Airlock constellation's configuration, secrets management, and feature control.

## Quick Start

```bash
# 1. Copy the secrets template
cp secrets/.env.constellation.example secrets/.env.constellation

# 2. Fill in your API keys (see secrets/manifest.yaml for where to get each one)
nano secrets/.env.constellation

# 3. Generate per-repo .env files
./scripts/setup.sh

# 4. Validate your setup
python3 scripts/validate.py
```
````

## What's Here

| Directory        | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| `secrets/`       | Key manifest, rotation runbook, .env.constellation template |
| `environments/`  | Per-environment topology (local, staging, production)       |
| `feature-flags/` | Feature toggles, calibration parameters                     |
| `platform/`      | Billing tiers, domain/CORS config                           |
| `registries/`    | Component and schema registries (agents write here)         |
| `capabilities/`  | Constellation tool detection manifest                       |
| `defaults/`      | Content resolution, pack defaults                           |
| `scripts/`       | Setup and validation scripts                                |

## Secrets Management

All API keys live in ONE file: `secrets/.env.constellation` (gitignored).

Run `./scripts/setup.sh` to generate per-repo `.env` files from it.

See `secrets/rotation-runbook.md` for rotation procedures.

## MCP Mode

This repo is a **read-write MCP server**:

- Read: All repos read config, flags, tiers, registries
- Write: Agents write to `registries/` (components, schema)

````

**Step 3: Commit**

```bash
cd airlock-config
git add CLAUDE.md README.md AGENTS.md
git commit -m "docs: update CLAUDE.md, README, AGENTS for config constellation expansion"
````

---

## Task 12: Untrack .env.local in airlock-landing

**Files:**

- Modify: `airlock-landing/.env.local` (untrack from git)

**Step 1: Remove from git tracking**

```bash
cd airlock-landing
git rm --cached .env.local
git commit -m "fix: untrack .env.local — was committed despite gitignore"
```

The file stays on disk but is no longer tracked. The OpenRouter key in git history still needs rotation (handled separately by Zac at provider dashboards).

---

## Summary: Where to Put Your Keys

After running all tasks, here's the workflow:

1. **Open** `airlock-config/secrets/.env.constellation`
2. **Paste** all your rotated keys there
3. **Run** `./scripts/setup.sh`
4. **Done** — every repo has its `.env` generated

You never touch per-repo `.env` files again. Rotate a key? Update `.env.constellation`, re-run setup.sh.
