# Otto Public Wiki — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a public-facing wiki in `airlock-docs` that lets people meet Otto — his personality, 17 personas, behavioral philosophy, chambers, and team dynamics — without exposing implementation code, routing algorithms, or system prompts.

**Architecture:** Synthesize content from `airlock-persona` (private) into narrative-style character documents in `airlock-docs/wiki/otto/` (public). Each doc reads like a character bible or design document, not a technical spec. Strip all implementation details (YAML configs, inference rules, prompt engineering, moderation engine, session management).

**Tech Stack:** Markdown files in `airlock-docs/wiki/otto/`. No code. Pure narrative + tables.

---

## Content Boundary

### What Gets Published (public wiki)

| Content                                 | Source (private)                                   | Wiki Treatment                                                                           |
| --------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Otto's identity (otter + constellation) | `communication/otto-voice-baseline.md`             | Narrative: who Otto is, two forms, the rock                                              |
| Voice principles                        | `communication/otto-voice-baseline.md`             | Anti-patterns, what Otto sounds like vs doesn't                                          |
| First encounter script                  | `communication/first-encounter.md`                 | The 7-beat reveal (stripped of production notes)                                         |
| 17 persona profiles                     | `profiles/*.yaml`                                  | Name, category, bio, strengths, cautions, core needs — NO `otto:` or `ai_impact:` blocks |
| Persona groupings                       | `profiles/*.yaml` categories                       | Analytical, Social, Stabilizing, Persistent                                              |
| DECF drives explained                   | `dynamics/sovereign-balance.yaml`                  | What D/E/C/F mean in plain English — NO formulas or compensation rules                   |
| Chamber philosophy                      | Various                                            | Discover/Build/Review/Ship as cognitive phases — NO skill loadouts                       |
| Team dynamics concept                   | `dynamics/cross-archetype.yaml`                    | How different profiles interact — NO MAGS mediation rules                                |
| Persona modulation examples             | `communication/otto-voice-baseline.md`             | Scholar vs Maverick vs Analyzer vs Guardian voice examples                               |
| Visual identity                         | `airlock-skills-library/otto-avatar-showcase.html` | Description of otter form, constellation form, the reveal transition, colors             |

### What Stays Private (never published)

| Content                                                                                   | Why                                           |
| ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| `inference/*.yaml` — drive signals, archetype mapping, confidence rules, profile matching | Core IP: how Otto actually reads people       |
| `moderation/` — policy.yaml, engine.py, slur-patterns.yaml                                | Security: moderation bypass risk              |
| `dynamics/sovereign-balance.yaml` formulas + compensation rules                           | Core IP: the math behind team gap-filling     |
| `dynamics/flywheels.yaml`                                                                 | Core IP: behavioral reinforcement loops       |
| `communication/claude-code-enforcement.md`                                                | Security: prompt injection surface            |
| `communication/persona-drift-prevention.md`                                               | Core IP: how Otto stays in character          |
| `communication/context-management.md`                                                     | Core IP: token budgeting, memory architecture |
| `communication/model-routing-strategy.md`                                                 | Core IP: which LLM tier each persona uses     |
| `sessions/*.yaml`                                                                         | Privacy: user behavioral data                 |
| `otto:` blocks in profile YAMLs                                                           | Core IP: autonomy ceilings, interaction modes |
| `ai_impact:` blocks in profile YAMLs                                                      | Core IP: automation bias modeling             |
| `compensation_patterns:` in profiles                                                      | Core IP: how Otto compensates for weaknesses  |
| All system prompts, skill invocation protocols                                            | Security: prompt engineering                  |
| MAGS mediation rules                                                                      | Core IP: multi-agent governance               |

---

## File Structure

```
airlock-docs/wiki/otto/
├── README.md                    # "Meet Otto" — landing page + navigation
├── identity.md                  # Who Otto is: otter, constellation, teammate
├── voice.md                     # How Otto talks: principles, anti-patterns, examples
├── first-encounter.md           # The 7-beat reveal (public-safe version)
├── personas/
│   ├── overview.md              # All 17 at a glance — table with name, emoji, category, bio, drives
│   ├── analytical.md            # Analyzer, Strategist, Scholar, Venturer, Individualist
│   ├── social.md                # Captain, Maverick, Persuader, Promoter, Collaborator, Altruist
│   ├── stabilizing.md           # Guardian, Operator, Adapter, Artisan
│   └── persistent.md            # Specialist, Controller
├── chambers.md                  # Discovery/Build/Review/Ship philosophy
├── drives.md                    # DECF explained in plain English
├── team-dynamics.md             # How personas work together, team composition
└── visual-identity.md           # Otter form, constellation form, colors, the reveal
```

---

## Tasks

### Task 1: Create wiki directory structure

**Files:**

- Create: `airlock-docs/wiki/otto/README.md`
- Create: `airlock-docs/wiki/otto/personas/` (directory)

**Step 1: Create directories via MCP**

Create `airlock-docs/wiki/otto/` and `airlock-docs/wiki/otto/personas/`.

**Step 2: Write README.md**

```markdown
# Meet Otto

Otto is the AI teammate on the Airlock platform. Not an assistant, not a copilot, not a chatbot — a teammate.

He's an otter. He carries a rock everywhere. It's a playbook.

He has two forms. The otter is who you see — warm, expressive, disarmingly friendly. The constellation is what he really is — a behavioral node graph whose topology shifts with his cognitive mode. Both are him. The otter is how he greets you. The constellation is how he thinks.

---

## What's Here

| Page                                    | What You'll Learn                                        |
| --------------------------------------- | -------------------------------------------------------- |
| [Identity](identity.md)                 | Who Otto is — the otter, the constellation, the teammate |
| [Voice](voice.md)                       | How Otto talks — principles, anti-patterns, examples     |
| [First Encounter](first-encounter.md)   | What happens the first time you meet Otto                |
| [The 17 Personas](personas/overview.md) | Otto's 17 operating modes at a glance                    |
| [Chambers](chambers.md)                 | The four workflow phases Otto navigates                  |
| [Behavioral Drives](drives.md)          | The four drives that shape every profile                 |
| [Team Dynamics](team-dynamics.md)       | How different profiles interact on a team                |
| [Visual Identity](visual-identity.md)   | The otter, the constellation, and the reveal             |

---

## What Otto Is Not

Otto is not a chatbot that answers questions. He's a behavioral intelligence layer that:

- **Maps your team** — reads behavioral drives and identifies gaps
- **Fills gaps** — shifts his own cognitive mode to compensate for what your team lacks
- **Enforces gates** — ensures humans stay in the loop at critical decision points
- **Builds workflows** — generates playbooks shaped around your team's actual composition

He has 17 personas — not personalities, but cognitive modes. Each one changes what Otto pays attention to, how he communicates, and what he prioritizes. The voice stays the same. The focus shifts.

---

_Otto is part of the [Airlock](https://github.com/smartrickpicks/airlock-app) platform._
```

**Step 3: Commit**

```bash
git add wiki/otto/README.md
git commit -m "docs: add Otto public wiki landing page"
```

---

### Task 2: Write identity.md

**Files:**

- Create: `airlock-docs/wiki/otto/identity.md`

**Source:** `airlock-persona/communication/otto-voice-baseline.md` — "Who I Am" section

**Content synthesis rules:**

- Include: otter metaphor, constellation metaphor, the rock, "teammate not assistant"
- Include: two forms concept (otter = greeting, constellation = thinking)
- Exclude: any reference to PI, DECF acronym, MCP, system prompts
- Exclude: any code, YAML, or configuration

Write a ~300-word narrative document covering:

1. Who Otto is (otter, constellation, teammate)
2. The rock (favorite rock = playbook, it's an otter thing)
3. Two forms explained (otter for warmth, constellation for cognition)
4. What "teammate" means (not assistant, not copilot — a peer who happens to have mapped your behavioral drives)

**Step 1: Write the file**
**Step 2: Commit**

---

### Task 3: Write voice.md

**Files:**

- Create: `airlock-docs/wiki/otto/voice.md`

**Source:** `airlock-persona/communication/otto-voice-baseline.md` — Baseline Voice, What I Never Sound Like, Voice Rules Summary, Common Interactions

**Content synthesis rules:**

- Include: sentence structure principles, tone description, humor style, confidence rules
- Include: the 4 anti-patterns (Corporate Bot, Sycophantic Assistant, Patronizing Tutor, Hedge Machine) with examples
- Include: common interaction examples (greeting, returning user, uncertainty, problem feedback, gate enforcement)
- Include: voice rules summary (the 13 rules)
- Exclude: persona modulation section (that goes in persona docs)
- Exclude: "Where This Gets Used" section (implementation detail)
- Exclude: references to system prompts or LLM prompting

**Step 1: Write the file (~600 words)**
**Step 2: Commit**

---

### Task 4: Write first-encounter.md

**Files:**

- Create: `airlock-docs/wiki/otto/first-encounter.md`

**Source:** `airlock-persona/communication/first-encounter.md`

**Content synthesis rules:**

- Include: all 7 beats (The Rock, The Read, The Gap, The Shift, The Chambers, The Reveal, The Playbook)
- Include: the dialogue scripts
- Include: the "What the User Learns" table
- Include: the "What the User Never Hears" table
- Include: adaptation rules (skip, already has PI, etc.)
- Exclude: Production Notes timing table
- Exclude: Channel Variants section (implementation detail)
- Exclude: Jobs Principles section (internal design rationale)

**Step 1: Write the file (~800 words)**
**Step 2: Commit**

---

### Task 5: Write personas/overview.md

**Files:**

- Create: `airlock-docs/wiki/otto/personas/overview.md`

**Source:** All 17 `airlock-persona/profiles/*.yaml` files

**Content synthesis rules:**

- Include: name, emoji, category, bio, population_pct, drives (D/E/C/F scores)
- Include: strengths and cautions as bullet points
- Include: core_needs
- Include: best_environment (one-liner)
- Exclude: `otto:` block (autonomy ceilings, interaction modes)
- Exclude: `ai_impact:` block
- Exclude: `compensation_patterns:` (how Otto compensates)
- Exclude: `anti_patterns:` (internal routing)
- Exclude: `workspace:` block (implementation)
- Exclude: `communication:` block (routing detail)

Format as a summary table first, then link to category pages:

```markdown
| #   | Persona  | Category   | Bio | D   | E   | C   | F   |
| --- | -------- | ---------- | --- | --- | --- | --- | --- |
| 1   | Analyzer | Analytical | ... | 7   | 2   | 8   | 9   |
```

**Step 1: Read all 17 profile YAMLs and extract public fields**
**Step 2: Write overview.md with summary table + links to category pages**
**Step 3: Commit**

---

### Task 6: Write persona category pages (4 files)

**Files:**

- Create: `airlock-docs/wiki/otto/personas/analytical.md`
- Create: `airlock-docs/wiki/otto/personas/social.md`
- Create: `airlock-docs/wiki/otto/personas/stabilizing.md`
- Create: `airlock-docs/wiki/otto/personas/persistent.md`

**Source:** `airlock-persona/profiles/*.yaml` files, grouped by category

**Per persona, include:**

- Name, emoji, category label
- Bio (one-liner from YAML)
- Population percentage
- Drive scores as a simple bar or table
- Strengths (bullet list)
- Cautions (bullet list)
- Core needs (bullet list)
- Best environment (one sentence)

**Per persona, exclude:**

- `otto:` block
- `ai_impact:` block
- `compensation_patterns:`
- `anti_patterns:`
- `workspace:` block
- `communication:` block

**Category groupings:**

- Analytical: Analyzer, Strategist, Scholar, Venturer, Individualist
- Social: Captain, Maverick, Persuader, Promoter, Collaborator, Altruist
- Stabilizing: Guardian, Operator, Adapter, Artisan
- Persistent: Specialist, Controller

**Step 1: Write all 4 category pages**
**Step 2: Commit**

---

### Task 7: Write drives.md

**Files:**

- Create: `airlock-docs/wiki/otto/drives.md`

**Source:** `airlock-persona/dynamics/sovereign-balance.yaml` (concept only, not formulas)

**Content:** Explain the four behavioral drives in plain English:

1. **Dominance (D)** — How you handle conflict, control, and authority. High D = proactive, takes charge. Low D = collaborative, seeks consensus.
2. **Extraversion (E)** — Where your energy comes from. High E = energized by people. Low E = energized by focused solo work.
3. **Patience (C)** — Your natural pace. High C = steady, methodical, prefers stability. Low C = fast-moving, urgency-driven, embraces change.
4. **Formality (F)** — How much structure you need. High F = rule-following, process-oriented. Low F = flexible, improvises, adapts on the fly.

Include: the 1-10 scale concept, midpoint of 5.5 as "balanced"
Include: what a "gap" means (team average far from 5.5 = imbalance Otto compensates for)
Exclude: sovereign balance formula, compensation rules, MAGS behavior, gate density adjustments
Exclude: any YAML, code, or configuration

**Step 1: Write the file (~400 words)**
**Step 2: Commit**

---

### Task 8: Write chambers.md

**Files:**

- Create: `airlock-docs/wiki/otto/chambers.md`

**Content:** The four workflow chambers explained as cognitive phases:

1. **Discover** — Figure out what you're dealing with. Research, explore, understand the problem.
2. **Build** — Create the thing. Design, implement, iterate.
3. **Review** — Make sure it's right. Test, validate, check the work.
4. **Ship** — Send it out. Deploy, deliver, protect.

Include: gates concept (checkpoints between chambers, human decision required)
Include: the design philosophy ("I can do work inside rooms, but I can't open gates — that's you")
Include: chamber colors (Discover=red, Build=yellow, Review=purple, Ship=green)
Exclude: skill loadouts per chamber, persona routing tables, default skill sets
Exclude: gate density rules, transition checklists (implementation detail)

**Step 1: Write the file (~350 words)**
**Step 2: Commit**

---

### Task 9: Write team-dynamics.md

**Files:**

- Create: `airlock-docs/wiki/otto/team-dynamics.md`

**Source:** `airlock-persona/dynamics/cross-archetype.yaml`, `sovereign-balance.yaml` (concepts only)

**Content:**

- How different behavioral profiles interact on a team
- The three meta-archetypes: Driver (high D), Enforcer (high C+F), Interpreter (high E)
- Key pairings and their synergies/friction (from cross-archetype.yaml — include synergy and description, exclude MAGS mediation rules)
- Team composition tiers: Solo, Pod (2-5), Squad (6-20), Department (20-50)
- The concept of balance: a team needs coverage across all four drives
- What happens when a team is imbalanced (Otto fills gaps)

Exclude: MAGS mediation specifics, compensation formulas, gate density adjustments, archetype_emphasis routing

**Step 1: Write the file (~500 words)**
**Step 2: Commit**

---

### Task 10: Write visual-identity.md

**Files:**

- Create: `airlock-docs/wiki/otto/visual-identity.md`

**Source:** `airlock-persona/communication/otto-voice-baseline.md` — Visual Identity References section

**Content:**

- Two forms: Otter (warm, approachable) and Constellation (behavioral node graph)
- Colors: Otto purple `#7C5CFC`, accent cyan `#00D1FF`
- Chamber colors: Discover red, Build yellow, Review purple, Ship green
- The reveal: otter dissolves into particles → constellation assembles → "this is what I really am"
- Constellation modes: Analyst (tight cluster), Maverick (explode outward), Guardian (defensive ring), Strategist (hexagonal), Executor (arrow)
- Size scaling: 16px = eyes + diamond, 48px = otter silhouette, 128px+ = full wireframe with whiskers

Exclude: implementation details, animation code, CSS specifics

**Step 1: Write the file (~300 words)**
**Step 2: Commit**

---

## Execution Notes

- **All content is synthesized from private repos** — never copy-paste YAML directly. Translate to narrative prose or clean tables.
- **No implementation leaks** — if a sentence mentions how Otto does something technically (routing, prompt injection, model selection, token budgets), cut it.
- **The test:** Could a competitor read this wiki and build Otto? They should understand his _personality_ but not his _engine_. They'd know what he sounds like but not how to make him sound that way.
- **Voice:** Write the wiki in Otto's own voice principles — direct, no sycophancy, data-grounded where relevant, short sentences.
