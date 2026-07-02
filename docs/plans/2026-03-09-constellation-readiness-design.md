# Constellation Readiness Audit — Design

**Date:** 2026-03-09
**Status:** Approved
**Approach:** Hybrid auto-detect + capability manifest (Approach 1/D)

## Problem

We need to know whether the Airlock constellation has the open-source components installed to support all operational workflows — content creation, code review, docs, slides, spreadsheets, Kanban, Gantt, flowcharts, and more. Currently there's no single command that answers "what's missing and what should I install next?"

## Solution

A Claude skill (`/readiness`) that reads a capability manifest from `airlock-config`, auto-detects what's installed across the codebase, scores readiness per category, and outputs a data-storytelling narrative with gaps, recommendations, and a research prompt for the internal chat interface.

## Audience

The operator (Zachary) — "show me gaps in my tooling so I know what to install/configure next."

## Deliverables

1. **`airlock-config/capabilities/manifest.yaml`** — canonical capability map
2. **`~/.claude/skills/constellation-readiness/`** — the `/readiness` skill

## Capability Manifest Structure

Lives in `airlock-config/capabilities/manifest.yaml`. Each entry defines:

```yaml
version: "1.0"
categories:
  <category_id>:
    weight: 1-5 # Higher = more critical for operations
    capabilities:
      - id: <unique_id>
        name: "Human-readable name"
        detect:
          type: npm_package | pip_package | component | mcp_server | skill | env_var | file_exists
          package: "<package name>" # for npm/pip
          glob: "<pattern>" # for component
          server: "<name>" # for mcp_server
          dir: "<name>" # for skill
          var: "<name>" # for env_var
          path: "<path>" # for file_exists
        recommendation: "Library name"
        install: "install command"
        why: "What workflow this unlocks"
```

### Detection Types

| Type          | How It Checks                                                |
| ------------- | ------------------------------------------------------------ |
| `npm_package` | Reads `apps/web/package.json` dependencies + devDependencies |
| `pip_package` | Reads `apps/api/requirements.txt` or `pyproject.toml`        |
| `component`   | Globs for file pattern in `apps/web/src/`                    |
| `mcp_server`  | Parses `.mcp.json` for server key                            |
| `skill`       | Checks `~/.claude/skills/<dir>/` exists                      |
| `env_var`     | Checks `apps/api/.env` for non-empty value                   |
| `file_exists` | Checks if path exists on filesystem                          |

## 10 Categories (All Operational Workflows)

| Category           | Weight | Key Capabilities                                                 |
| ------------------ | ------ | ---------------------------------------------------------------- |
| Code Quality       | 5      | Linting, type-check, testing, security scan, code review         |
| Documents          | 4      | PDF parse, rich text edit, contract gen, doc preview             |
| Content Creation   | 3      | Markdown/MDX, email templates, blog/landing, social              |
| Spreadsheets       | 4      | Excel read/write, interactive grid, CSV import, formulas         |
| Project Management | 5      | Kanban board, Gantt chart, calendar, timeline                    |
| Presentations      | 3      | Slide generation, pitch decks, PDF export                        |
| Diagrams           | 3      | Flowcharts, node graphs, whiteboard, Mermaid                     |
| Data & Analytics   | 4      | Charts, dashboards, data tables, CSV export                      |
| Design             | 2      | Moodboards, wireframes, icons, color palettes                    |
| Communication      | 3      | Messenger (internal), email drafts, notifications, meeting notes |

## Output Format (Data Storytelling)

The skill output follows the data-storytelling narrative arc:

### 1. Hook (3 lines)

```
CONSTELLATION READINESS AUDIT
Score: 58/100 — CONDITIONAL
"6 capabilities blocking full operational coverage"
```

### 2. Category Breakdown (progress bars)

```
Code Quality        ████████████████████  100%  READY
Documents           ████████████████░░░░   80%  READY
Project Management  ████████░░░░░░░░░░░░   40%  GAPS
Spreadsheets        ░░░░░░░░░░░░░░░░░░░░    0%  MISSING
```

### 3. Top Blockers (sorted by weighted impact)

```
1. Kanban Board [Project Mgmt, weight:5]
   Need: @hello-pangea/dnd
   Run:  cd apps/web && pnpm add @hello-pangea/dnd
   Why:  Unlocks Triage drag-drop, CRM pipeline view
```

### 4. Already Working (compact list)

```
✓ TipTap (rich text)    ✓ Recharts (charts)
✓ React Flow (diagrams)  ✓ 64 Claude skills
```

### 5. Next Action (rule of three)

```
Install top 3 blockers to reach 75% readiness:
  cd apps/web && pnpm add @hello-pangea/dnd frappe-gantt xlsx
```

### 6. Research Prompt (auto-generated from gaps)

```
RESEARCH PROMPT (for internal chat)
────────────────────────────────────
Find the best open-source GitHub repositories for each
of these capabilities in a React/Next.js 14 + Python/FastAPI
enterprise platform:

1. Interactive spreadsheet component...
2. Gantt chart component...

For each, compare: GitHub stars, last commit date, bundle
size, TypeScript support, license. Prefer MIT/Apache-2.0.
```

The research prompt is dynamically built — only includes MISSING and PARTIAL capabilities. Designed for the internal Airlock research chat interface (not external Perplexity).

## Scoring

- **Per category:** `(found / total_capabilities) * 100`
- **Overall:** Weighted average across all categories
- **Verdict thresholds:**
  - 80+ → READY
  - 60+ → CONDITIONAL
  - 40+ → CAUTION
  - <40 → NOT READY

## Skill Behavior

- **Read-only** — never installs, modifies files, or makes network calls
- **Fast** — reads package.json, globs, checks paths. No API calls.
- **Idempotent** — safe to run anytime, multiple times
- **Filterable** — `/readiness --category diagrams` to audit one category
- **Manifest lives in airlock-config** — versioned, shared across agents

## Non-Goals

- Does not install packages (just recommends)
- Does not run functional probes (v1 — can add `--deep` later)
- Does not modify the manifest (operator curates it manually)
- Does not replace the launch_readiness_scorer (that's product-launch focused, this is tooling-focused)
