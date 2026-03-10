# Airlock Landing Page Enhancement Spec

> **For:** Agent building out landing page + Mintlify docs at doyoulikedags.xyz
> **Date:** 2026-03-10
> **Repos:** airlock-landing (landing page), airlock-docs (Mintlify docs)

---

## Positioning Statement

"Airlock is the first AI-native workspace that brings contract lifecycle management, CRM, and team operations into a single, conversation-driven platform — purpose-built for industries where every contract is a relationship."

## The White Space

No competitor combines CLM + CRM + project management + AI agents in a single platform with a communication-first UX. Every tool is either deep-but-narrow (Ironclad, Icertis) or broad-but-shallow (Notion, ClickUp). Airlock fills the gap.

| Dimension             | CLM Tools | Workspace Tools | Airlock                             |
| --------------------- | --------- | --------------- | ----------------------------------- |
| Contract intelligence | Strong    | None            | Strong                              |
| CRM built-in          | None      | Weak            | Native (vault hierarchy IS the CRM) |
| Project management    | None      | Strong          | Native (Triage module)              |
| Communication UX      | None      | Bolted on       | Core architecture                   |
| AI agents             | Emerging  | Emerging        | Native, personality-driven          |
| Industry-specific     | Generic   | Generic         | Entertainment-first vertical        |

---

## Page Structure (Narrative Arc)

### Hero Section

**Headline:** "One workspace. Every deal."

**Subheadline:** "Airlock unifies contract lifecycle, CRM, and project management in a Discord-like workspace powered by AI agents — so your team stops context-switching and starts closing."

**Visual:** "Convergence" animation — tool icons (Salesforce, DocuSign, Jira, Slack, Sheets, email) flying in and collapsing into the Airlock Triptych interface. 3-5 seconds, loops.

**CTA:** "Request Early Access" (email + company + role, 3 fields max)

### Act 1 — "The Fragmentation Tax" (Setup)

**Goal:** Recognition — "that's us."

- **Animated diagram**: 6-8 tool icons with chaotic connection lines. Label: "Your stack today."
- **Stat callout**: "Teams use an average of 8 tools to manage a single deal lifecycle."
- **Pain bullets:**
  - Contract redlines lost in email threads
  - CRM data decays 30% per year without maintenance
  - Task status meetings exist because tools don't talk to each other
  - New hires take 3 months to learn your tool maze
  - 9.2% of annual revenue lost to poor contract management (WorldCC)

### Act 2 — "Why Integrations Don't Fix It" (Conflict)

- **Integration spaghetti visual**: Same tool icons now connected by Zapier/middleware arrows — looks worse. "Adding integrations doesn't reduce complexity — it multiplies failure points."
- **Key insight**: "Integrations sync data. Airlock unifies context. There's a difference."
- **Comparison table** (subtle):

| Approach                   | Data sync    | Shared context | Single workflow | AI sees everything |
| -------------------------- | ------------ | -------------- | --------------- | ------------------ |
| Point tools + Zapier       | Partial      | No             | No              | No                 |
| Suite (Salesforce/HubSpot) | Within suite | Partial        | Partial         | Bolted-on          |
| **Airlock**                | Native       | Yes            | Yes             | Native (Otto)      |

### Act 3 — "One Platform. One Brain." (Resolution)

- **Interactive Triptych Demo**: Show Signal | Orchestrate | Control with a vault flowing Discover → Ship
- **Module showcase** (tabbed cards):
  - Contracts — "4 chambers, zero lost redlines"
  - CRM — "Pipeline, health scores, and leads inside the same workspace"
  - Triage — "Kanban, timeline, and agenda without another subscription"
  - Calendar — "Every deadline, renewal, and milestone in one view"
  - Documents — "Library, spreadsheet, and editor — context-aware"
  - Otto (AI) — "An AI agent that knows your contracts, pipeline, and team's work style"

**CTA:** "See It In Action"

### Chamber Flow Section

Horizontal animated pipeline: **Discover → Build → Review → Ship**

- Each chamber lights up with its color (red → yellow → purple → green) on scroll
- Click/hover reveals what happens inside each chamber
- Show role badges: Builder (Discover+Build), Gatekeeper (Review), Owner (Ship)

### Metrics Section

| Metric                  | Value | Context                                     |
| ----------------------- | ----- | ------------------------------------------- |
| Pre-approved clauses    | 188   | Across 5 verticals                          |
| Contract types          | 24    | Music, media, entertainment, tech, services |
| Field registry entries  | 442   | AI extraction targets                       |
| Context assembly        | <2s   | From vault open to full context             |
| AI personality profiles | 17    | Team dynamics intelligence                  |
| Constellation repos     | 8     | Enterprise-grade architecture               |

### ROI Calculator (Interactive)

Inputs: contracts/month, avg value, current tools (checkboxes), team size
Outputs: hours saved, revenue acceleration, tool cost savings
**CTA:** "Get Your Full Report" (email capture)

### Trust & Security Section

6 trust indicators:

1. Envelope Encryption (AES-256)
2. Row-Level Security (tenant isolation)
3. Crypto-Shredding (data deletion)
4. Role-Based Access Control (Builder/Gatekeeper/Owner)
5. Stateless Infrastructure (horizontal scaling)
6. Real-Time Event Sync (audit trail)

### Architecture Credibility Block

"Built on Constellation — 8 interconnected repos, not a monolith."

Show the constellation: airlock-app, airlock-docs, airlock-config, airlock-skills-library, airlock-playbooks, airlock-coordination, airlock-gen-ui, airlock-persona

**CTA:** "Talk to the Founder" (Calendly)

### Social Proof (Phase-Appropriate)

- Waitlist count (if >100)
- "Join X teams on the waitlist"
- Founder credibility section (background, domain expertise)
- Architecture transparency ("Open about how we built it")

### Final CTA

"Ready to unify your deal lifecycle?"
**CTA:** "Request Early Access"

---

## What's Currently Missing (Add These)

1. **Pricing section** — Even "Contact for pricing" with tier hints
2. **FAQ section** — Security, integrations, onboarding, data migration
3. **Use case pages** — Entertainment/music vertical, legal teams, enterprise ops
4. **Comparison page** — vs Ironclad, Icertis, DocuSign CLM, Juro
5. **Team/About section** — Founder story, mission
6. **Blog/Content hub** — Link to educational content
7. **Legal pages** — Privacy, Terms, Security (currently dead # links)
8. **"A Day With vs Without" section** — Split-screen scrollytelling

---

## Key Stats to Feature

### Problem Stats (Act 1)

- Knowledge workers switch apps 25x/day (Asana)
- 9.2% of annual revenue lost to poor contract management (WorldCC/IACCM)
- CRM data decays ~30%/year (Gartner)
- 40% of contract cycle time is administrative (Deloitte)
- Average enterprise uses 130+ SaaS apps (Productiv)

### Market Stats (Credibility)

- CLM market: $1.24B (2025) → $5.65B (2030), 13% CAGR
- AI Agent market: $7.6B (2025) → $50B+ (2030)
- 40% of enterprise apps will feature AI agents by 2026 (Gartner)
- AI in enterprise collaboration: $22.87B → $92.93B by 2035
- Global music industry: $29.6B (2024), 69% streaming

---

## Design System (Already Established)

**Use existing tokens from the landing page:**

| Token              | Value            |
| ------------------ | ---------------- |
| --bg-base          | #060910          |
| --bg-raised        | #0C1017          |
| --accent-primary   | #00D1FF (cyan)   |
| --accent-secondary | #6366F1 (indigo) |
| --accent-tertiary  | #A855F7 (purple) |
| --chamber-discover | #EF4444 (red)    |
| --chamber-build    | #EAB308 (yellow) |
| --chamber-review   | #A855F7 (purple) |
| --chamber-ship     | #22C55E (green)  |

**Style:** Linear-style dark mode, glass-morphism, gradient text, glow effects, Framer Motion animations.

**Fonts:** Inter (sans), Fira Code (mono)

---

## Mintlify Docs Enhancements

**Current state:** Comprehensive 2-tab structure (Documentation | Platform) with full specs.

**Add:**

- Quickstart guide (5-min "Hello World" vault creation)
- API reference section (when ready)
- Video walkthroughs embedded in key pages
- Interactive examples (code snippets for API, config for MCP)
- Changelog page
- Migration guides (from Ironclad, DocuSign, spreadsheets)
- Glossary page promoted to top-level nav

---

## CTA Placement Map

| Section              | CTA                    | Type        |
| -------------------- | ---------------------- | ----------- |
| Hero (above fold)    | "Request Early Access" | Primary     |
| After Triptych demo  | "See It In Action"     | Secondary   |
| After ROI calculator | "Get Your Full Report" | Lead gen    |
| After architecture   | "Talk to the Founder"  | High-intent |
| Sticky nav           | "Request Early Access" | Persistent  |
| Footer               | "Request Early Access" | Final       |

---

## Technical Notes

- **Stack:** Next.js 14, Tailwind, Framer Motion (already in place)
- **Deploy:** Vercel
- **Performance target:** Lighthouse 95+
- **Mobile:** Triptych demo collapses to carousel on mobile
- **Analytics:** Track scroll depth, CTA clicks, calculator completions
- **Mock data:** Can embed interactive demos using existing mock-\*.ts data

---

## White Label Architecture (Next Phase)

After landing page ships, the architecture supports white-labeling:

1. **doyoulikedags.xyz** — Gateway for users to configure their constellation
   - Google OAuth (grab Docs, Slides, Sheets, Drive workspace auths)
   - Constellation setup wizard
   - Deploy to custom domain or Vercel sandbox

2. **brainbrigade.xyz** — First production Airlock instance
   - Full module suite
   - Real API connections
   - Production database

3. **Deployment options:**
   - Agent-deployed to custom domain (full control, user provides API keys)
   - Vercel sandbox (hosted, we provide infra, limited AI without user's keys)
