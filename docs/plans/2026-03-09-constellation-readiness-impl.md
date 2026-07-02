# Constellation Readiness Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/readiness` skill that audits the Airlock constellation's tooling coverage across 10 operational categories, outputting a scored narrative with gaps, install commands, and a research prompt.

**Architecture:** YAML manifest in airlock-config defines "what complete looks like." Skill reads manifest, auto-detects installed packages/components/skills/MCP servers, scores each category, renders data-storytelling output.

**Tech Stack:** Claude skill (SKILL.md), YAML manifest, Bash detection (package.json parsing, file existence checks, glob matching).

---

### Task 1: Create the Capability Manifest

**Files:**

- Create: `/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-config/capabilities/manifest.yaml`

**Context:** This YAML file is the single source of truth for what "operationally complete" means. It lives in the airlock-config MCP repo so all agents can read it. The skill will parse this to know what to check.

**What's already installed** (from `apps/web/package.json`):

- `@hello-pangea/dnd` (Kanban drag-drop)
- `@tiptap/react` + `@tiptap/starter-kit` (rich text editor)
- `@xyflow/react` (React Flow — node diagrams)
- `lucide-react` (icon library)
- `@playwright/test` (E2E testing)
- `eslint`, `typescript` (code quality)

**What's already installed** (Python side, check `apps/api/`):

- `pdfplumber` (PDF parsing)
- `pytest` (testing)
- `ruff` (linting)

**Step 1: Create the capabilities directory**

```bash
mkdir -p /Users/zacharyholwerda/Desktop/Airlock/repos/airlock-config/capabilities
```

**Step 2: Write the manifest**

Create `/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-config/capabilities/manifest.yaml` with all 10 categories and ~40 capabilities. Each capability needs: `id`, `name`, `detect` (type + target), `recommendation`, `install` (if not installed), `why`.

```yaml
version: "1.0"
description: "Constellation capability manifest — defines what 'operationally complete' looks like"

categories:
  code_quality:
    name: "Code Quality"
    weight: 5
    capabilities:
      - id: eslint
        name: "JavaScript/TypeScript Linting"
        detect:
          type: npm_package
          package: eslint
        recommendation: "ESLint (installed)"
      - id: typescript
        name: "TypeScript Type Checking"
        detect:
          type: npm_package
          package: typescript
        recommendation: "TypeScript (installed)"
      - id: ruff_linter
        name: "Python Linting"
        detect:
          type: pip_package
          package: ruff
        recommendation: "Ruff"
        install: "cd apps/api && pip install ruff"
        why: "Fast Python linter replacing flake8+isort+pyupgrade"
      - id: playwright_e2e
        name: "E2E Testing"
        detect:
          type: npm_package
          package: "@playwright/test"
        recommendation: "Playwright (installed)"
      - id: pytest_testing
        name: "Python Unit Testing"
        detect:
          type: pip_package
          package: pytest
        recommendation: "pytest"
        install: "cd apps/api && pip install pytest"
        why: "Python test runner for API services"
      - id: code_review_skill
        name: "Code Review Skill"
        detect:
          type: skill
          dir: "requesting-code-review"
        recommendation: "requesting-code-review skill (installed)"

  documents:
    name: "Documents"
    weight: 4
    capabilities:
      - id: rich_text_editor
        name: "Rich Text Editor"
        detect:
          type: npm_package
          package: "@tiptap/react"
        recommendation: "TipTap (installed)"
      - id: pdf_parsing
        name: "PDF Text Extraction"
        detect:
          type: pip_package
          package: pdfplumber
        recommendation: "pdfplumber"
        install: "cd apps/api && pip install pdfplumber"
        why: "Extract text from uploaded PDFs for vault creation"
      - id: docx_generation
        name: "Word Document Generation"
        detect:
          type: npm_package
          package: docx
        recommendation: "docx (officegen)"
        install: "cd apps/web && pnpm add docx"
        why: "Generate .docx contracts and reports for download"
      - id: pdf_export
        name: "PDF Export/Generation"
        detect:
          type: npm_package
          package: "@react-pdf/renderer"
        recommendation: "@react-pdf/renderer"
        install: "cd apps/web && pnpm add @react-pdf/renderer"
        why: "Generate PDF reports, contracts, and exports from React components"

  content_creation:
    name: "Content Creation"
    weight: 3
    capabilities:
      - id: markdown_mdx
        name: "MDX Authoring"
        detect:
          type: npm_package
          package: "@mdx-js/react"
        recommendation: "@mdx-js/react"
        install: "cd apps/web && pnpm add @mdx-js/react @mdx-js/loader"
        why: "Author rich content pages with embedded React components"
      - id: email_templates
        name: "Email Template Engine"
        detect:
          type: npm_package
          package: "react-email"
        recommendation: "react-email"
        install: "cd apps/web && pnpm add react-email @react-email/components"
        why: "Build and preview email templates with React components"
      - id: content_skill
        name: "Content Engine Skill"
        detect:
          type: skill
          dir: "content-engine"
        recommendation: "content-engine skill (installed)"
      - id: article_skill
        name: "Article Writing Skill"
        detect:
          type: skill
          dir: "article-writing"
        recommendation: "article-writing skill (installed)"

  spreadsheets:
    name: "Spreadsheets"
    weight: 4
    capabilities:
      - id: excel_read_write
        name: "Excel Read/Write (.xlsx)"
        detect:
          type: npm_package
          package: xlsx
        recommendation: "SheetJS (xlsx)"
        install: "cd apps/web && pnpm add xlsx"
        why: "Import/export Excel files for financial models and bulk data"
      - id: csv_parsing
        name: "CSV Parsing"
        detect:
          type: npm_package
          package: papaparse
        recommendation: "Papa Parse"
        install: "cd apps/web && pnpm add papaparse && pnpm add -D @types/papaparse"
        why: "Fast CSV import/export for data operations"
      - id: spreadsheet_grid
        name: "Interactive Spreadsheet Grid"
        detect:
          type: npm_package
          package: fortune-sheet
        recommendation: "FortuneSheet (Luckysheet successor)"
        install: "cd apps/web && pnpm add fortune-sheet"
        why: "Excel-like grid UI with formulas, sorting, filtering"

  project_management:
    name: "Project Management"
    weight: 5
    capabilities:
      - id: kanban_dnd
        name: "Kanban Drag-and-Drop"
        detect:
          type: npm_package
          package: "@hello-pangea/dnd"
        recommendation: "@hello-pangea/dnd (installed)"
      - id: gantt_chart
        name: "Gantt Chart"
        detect:
          type: npm_package
          package: frappe-gantt
        recommendation: "frappe-gantt"
        install: "cd apps/web && pnpm add frappe-gantt"
        why: "Timeline views with dependency arrows for vault lifecycle tracking"
      - id: calendar_view
        name: "Calendar Component"
        detect:
          type: npm_package
          package: "@fullcalendar/react"
        recommendation: "FullCalendar"
        install: "cd apps/web && pnpm add @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction"
        why: "Calendar module views — deadlines, SLA dates, meetings"
      - id: triage_board
        name: "Triage Board Component"
        detect:
          type: component
          glob: "src/components/**/TriageBoard*.tsx"
        recommendation: "Custom TriageBoard organism"

  presentations:
    name: "Presentations"
    weight: 3
    capabilities:
      - id: slide_generator
        name: "Slide/Deck Generation"
        detect:
          type: npm_package
          package: "reveal.js"
        recommendation: "reveal.js"
        install: "cd apps/web && pnpm add reveal.js"
        why: "Generate HTML presentation decks from markdown/data"
      - id: marp_slides
        name: "Markdown-to-Slides"
        detect:
          type: npm_package
          package: "@marp-team/marp-core"
        recommendation: "Marp"
        install: "cd apps/web && pnpm add @marp-team/marp-core"
        why: "Convert markdown files to slide decks"
      - id: frontend_slides_skill
        name: "Frontend Slides Skill"
        detect:
          type: skill
          dir: "frontend-slides"
        recommendation: "frontend-slides skill (installed)"
      - id: pdf_deck_export
        name: "PDF Deck Export"
        detect:
          type: npm_package
          package: "puppeteer"
        recommendation: "Puppeteer (for PDF rendering)"
        install: "cd apps/web && pnpm add -D puppeteer"
        why: "Convert HTML slides to PDF for distribution"

  diagrams:
    name: "Diagrams & Flowcharts"
    weight: 3
    capabilities:
      - id: react_flow
        name: "Node-Based Diagrams"
        detect:
          type: npm_package
          package: "@xyflow/react"
        recommendation: "React Flow (installed)"
      - id: mermaid_render
        name: "Mermaid Diagram Rendering"
        detect:
          type: npm_package
          package: mermaid
        recommendation: "Mermaid"
        install: "cd apps/web && pnpm add mermaid"
        why: "Render flowcharts, sequence diagrams, ER diagrams from text"
      - id: excalidraw
        name: "Hand-Drawn Diagrams"
        detect:
          type: npm_package
          package: "@excalidraw/excalidraw"
        recommendation: "Excalidraw"
        install: "cd apps/web && pnpm add @excalidraw/excalidraw"
        why: "Collaborative whiteboard for hand-drawn architecture diagrams"
      - id: tldraw_whiteboard
        name: "Collaborative Whiteboard"
        detect:
          type: npm_package
          package: "tldraw"
        recommendation: "tldraw"
        install: "cd apps/web && pnpm add tldraw"
        why: "Full whiteboard canvas (Miro alternative) for process mapping"

  data_analytics:
    name: "Data & Analytics"
    weight: 4
    capabilities:
      - id: charts_library
        name: "Charts Library"
        detect:
          type: npm_package
          package: recharts
        recommendation: "Recharts"
        install: "cd apps/web && pnpm add recharts"
        why: "Composable chart components for dashboards and analytics views"
      - id: data_tables
        name: "Advanced Data Tables"
        detect:
          type: npm_package
          package: "@tanstack/react-table"
        recommendation: "TanStack Table"
        install: "cd apps/web && pnpm add @tanstack/react-table"
        why: "Sortable, filterable, paginated tables for CRM and Triage"
      - id: observable_plot
        name: "Statistical Visualization"
        detect:
          type: npm_package
          package: "@observablehq/plot"
        recommendation: "Observable Plot"
        install: "cd apps/web && pnpm add @observablehq/plot"
        why: "Statistical charts, distribution plots, data exploration"

  design:
    name: "Design"
    weight: 2
    capabilities:
      - id: icon_library
        name: "Icon Library"
        detect:
          type: npm_package
          package: lucide-react
        recommendation: "Lucide React (installed)"
      - id: ui_ux_skill
        name: "UI/UX Design Skill"
        detect:
          type: skill
          dir: "ui-ux-pro-max"
        recommendation: "ui-ux-pro-max skill (installed)"
      - id: color_palette
        name: "Design Token System"
        detect:
          type: file_exists
          path: "apps/web/src/styles/tokens.css"
        recommendation: "tokens.css (installed)"

  communication:
    name: "Communication"
    weight: 3
    capabilities:
      - id: messenger_backend
        name: "Messenger Backend"
        detect:
          type: component
          glob: "apps/api/src/messenger/routes.py"
        recommendation: "Airlock Messenger (installed)"
      - id: messenger_frontend
        name: "Messenger UI"
        detect:
          type: component
          glob: "src/components/organisms/OttoMessenger*.tsx"
        recommendation: "OttoMessenger components (installed)"
      - id: email_sending
        name: "Transactional Email"
        detect:
          type: pip_package
          package: resend
        recommendation: "Resend (Python SDK)"
        install: "cd apps/api && pip install resend"
        why: "Send transactional emails — notifications, invitations, reports"
      - id: notification_system
        name: "In-App Notification System"
        detect:
          type: component
          glob: "src/components/**/Notification*.tsx"
        recommendation: "Custom notification component"
        why: "Toast/banner notifications for vault events, gate changes, mentions"
```

**Step 3: Commit the manifest**

```bash
cd /Users/zacharyholwerda/Desktop/Airlock/repos/airlock-config
git add capabilities/manifest.yaml
git commit -m "feat: add constellation capability manifest for readiness audit"
```

---

### Task 2: Create the Readiness Skill — SKILL.md

**Files:**

- Create: `/Users/zacharyholwerda/.claude/skills/constellation-readiness/SKILL.md`

**Context:** This is the Claude skill file that defines the `/readiness` command. It contains the full instructions for how the skill reads the manifest, runs detections, scores results, and renders output using the data-storytelling format.

**Step 1: Create the skill directory**

```bash
mkdir -p /Users/zacharyholwerda/.claude/skills/constellation-readiness
```

**Step 2: Write SKILL.md**

Create `/Users/zacharyholwerda/.claude/skills/constellation-readiness/SKILL.md`:

````markdown
# Constellation Readiness Audit

Audit the Airlock constellation's tooling coverage across 10 operational categories. Reads a capability manifest, auto-detects installed packages/components, scores readiness, and outputs a narrative report with gaps and a research prompt.

## Trigger

Use when: user runs `/readiness`, asks "what tools are missing", "are we ready", "what should I install", or wants to audit constellation capabilities.

## Arguments

- `--category <name>` — audit only one category (e.g., `--category diagrams`)
- No args — audit all 10 categories

## Execution

### Phase 1: Load the Manifest

Read the capability manifest from the airlock-config MCP server:

```
/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-config/capabilities/manifest.yaml
```

Parse the YAML. For each category, collect its weight and list of capabilities.

### Phase 2: Detect Installed Capabilities

For each capability, run the appropriate detection:

| `detect.type` | How to Check                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm_package` | Read `apps/web/package.json` → check if `detect.package` exists in `dependencies` OR `devDependencies`      |
| `pip_package` | Run `cd apps/api && pip list --format=columns 2>/dev/null \| grep -i <package>` OR check `requirements.txt` |
| `component`   | Run Glob tool with `detect.glob` pattern from project root                                                  |
| `mcp_server`  | Read `.mcp.json` → check if `detect.server` is a key in `mcpServers`                                        |
| `skill`       | Check if directory exists: `~/.claude/skills/<detect.dir>/`                                                 |
| `env_var`     | Read `apps/api/.env` → check if `detect.var` has a non-empty value                                          |
| `file_exists` | Check if `detect.path` exists (relative to project root)                                                    |

Mark each capability as `found` (true/false).

### Phase 3: Score

For each category:

```
category_score = (found_count / total_count) * 100
```

Overall score (weighted average):

```
overall = sum(category_score * weight) / sum(weights)
```

Verdict:

- 80+ → READY
- 60-79 → CONDITIONAL
- 40-59 → CAUTION
- <40 → NOT READY

### Phase 4: Render Output

Use this exact format. Do NOT deviate from the structure.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CONSTELLATION READINESS AUDIT
  Score: {overall}/100 — {verdict}
  "{gap_count} capabilities blocking full operational coverage"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CATEGORY BREAKDOWN
──────────────────────────────────────────────
{For each category, sorted by score ascending:}
{name padded to 20 chars}  {progress bar 20 chars}  {score}%  {label}

Labels: 80-100% = READY, 50-79% = PARTIAL, 1-49% = GAPS, 0% = MISSING

Progress bar: █ for filled, ░ for empty, 20 chars total.

TOP BLOCKERS (by weighted impact)
──────────────────────────────────────────────
{For each missing capability, sorted by category_weight desc, then by name:}
{n}. {capability.name} [{category.name}, weight:{category.weight}]
   Need: {capability.recommendation}
   Run:  {capability.install}
   Why:  {capability.why}

Skip capabilities that have no `install` field (already installed or custom).

ALREADY WORKING
──────────────────────────────────────────────
{Two-column list of found capabilities, ✓ prefix, max 40 chars per column}

NEXT ACTION
──────────────────────────────────────────────
Install top 3 blockers to reach {projected_score}% readiness:
  {combined install command for top 3 npm packages}

RESEARCH PROMPT (for internal chat)
──────────────────────────────────────────────
Find the best open-source GitHub repositories for each of
these capabilities in a React/Next.js 14 + Python/FastAPI
enterprise platform:

{For each MISSING or PARTIAL category, numbered:}
{n}. {capability.name} — {capability.why}

For each, compare: GitHub stars, last commit date, bundle
size, TypeScript support, and license. Prefer MIT/Apache-2.0.
Exclude unmaintained projects (no commits in 6 months).
Rank by production readiness for an enterprise SaaS platform.
```

### Phase 5: Category Filter

If `--category <name>` is provided:

- Only audit that one category
- Skip the overall score and verdict
- Show detailed per-capability results for that category
- Still show the research prompt for gaps in that category

## Key Rules

- **Read-only** — NEVER install packages, modify files, or make network calls
- **Fast** — read files and glob, nothing else
- **Deterministic** — same manifest + same codebase = same output every time
- **No emoji** — use Unicode box-drawing characters for visual structure
````

**Step 3: Verify the skill is discoverable**

```bash
ls ~/.claude/skills/constellation-readiness/SKILL.md
```

Expected: file exists.

**Step 4: Commit (if desired)**

The skill lives in `~/.claude/skills/` which is not a git repo — no commit needed. The manifest in airlock-config is the only file to commit.

---

### Task 3: Test the Skill

**Step 1: Run `/readiness` in a new Claude session**

Type `/readiness` and verify:

- Manifest loads from airlock-config
- All 10 categories appear in the breakdown
- Installed packages (TipTap, React Flow, hello-pangea/dnd, Playwright, Lucide) show as found
- Missing packages (xlsx, frappe-gantt, mermaid, etc.) show as blockers
- Research prompt only includes missing/partial capabilities
- Score and verdict render correctly

**Step 2: Run with category filter**

Type `/readiness --category diagrams` and verify:

- Only the Diagrams category is audited
- React Flow shows as found
- Mermaid, Excalidraw, tldraw show as missing
- Research prompt scoped to diagram tools only

**Step 3: Validate scoring**

Count manually:

- Code Quality: 6 capabilities, expect ~5 found (ESLint, TS, Playwright, pytest, code-review skill) = ~83%
- Project Management: 4 capabilities, expect ~2 found (hello-pangea, TriageBoard) = ~50%
- Spreadsheets: 3 capabilities, expect 0 found = 0%

Verify the weighted average math is correct in the overall score.

---

### Task 4: Commit All Changes

**Step 1: Commit the manifest in airlock-config**

```bash
cd /Users/zacharyholwerda/Desktop/Airlock/repos/airlock-config
git add capabilities/manifest.yaml
git commit -m "feat: add constellation capability manifest (10 categories, ~40 capabilities)"
```

**Step 2: Verify**

```bash
git log --oneline -1
```

Expected: commit hash + message.
