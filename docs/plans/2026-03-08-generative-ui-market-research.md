# Market Research Report: Generative UI — Cognitive-Adaptive Omni-Stream Interfaces

> **Status:** RESEARCH COMPLETE — Produced by OTTO (AI research agent), verified March 8 2026.
> **Action items:** See Section 5 "What Needs Tightening" and corrections table in Section 2.

---

## Executive Summary

The Generative UI spec is directionally correct and well-timed. The protocol stack it describes (A2UI, AG-UI, MCP Apps) is real and converging exactly as claimed. The academic research cited is mostly verifiable, though several statistics are imprecise or slightly inflated. The competitive landscape confirms the core thesis: nobody is shipping cognitive-profile-driven adaptive enterprise UI in production today. The CLM market ($1.8B in 2025, growing to ~$5B by 2034) is adding AI features but remains focused on conversational search and agentic automation — not personality-aware rendering. This is genuine whitespace.

However, three risks need attention: (1) the MBTI/cognitive function science is contested in organizational psychology, (2) the nudge effectiveness literature has serious publication bias concerns, and (3) the 12-18 milestone roadmap is ambitious for a team that hasn't yet shipped Phase 1.

---

## 1. Protocol & Technology Claims — Verification

### Confirmed Real and Accurate

| Claim | Verdict | Notes |
|-------|---------|-------|
| Google A2UI | REAL but version is v0.8 (Public Preview), not v0.9 as stated | Announced Dec 22, 2025. Declarative JSON, flat component list, catalog-based security — all as described. Apache 2 licensed. |
| AG-UI (CopilotKit) | REAL | Open protocol for agent-to-frontend interaction. Born from CopilotKit's partnerships with LangGraph and CrewAI. First-party React + Angular clients. Microsoft has an official AG-UI integration. The "17 event types" claim could not be precisely verified but the event-based architecture is confirmed. |
| MCP Apps (Anthropic) | REAL | Announced Nov 21, 2025 as SEP-1865. Sandboxed iframe rendering confirmed. Launch partners include Amplitude, Asana, Box, Canva, Clay, Figma, Hex, monday.com, Slack, Salesforce. OpenAI also supports it. |
| Shopify MCP-UI | REAL | Intent-based messaging confirmed — components emit intents, agent interprets. Remote resource URIs loaded in sandboxed iframes. Shopify rolled this out to all stores. |
| shadcn MCP Server | REAL | CLI 3.0 with namespaced registries and MCP server released August 2025. MCP server enables AI agents to browse, search, and install components. Multi-registry support confirmed. |
| Tambo | REAL | Open-source generative UI SDK for React. Zod schema registration, two component types (Generative + Interactable) — all confirmed. Teams at Zapier, Rocket Money, Solink using it. 8,000+ GitHub stars. SOC 2 + HIPAA compliant. |
| Vercel AI SDK | ACCURATE | RSC approach (streamUI) is officially paused. Recommendation shifted to AI SDK UI with tool-calling patterns. useChat + tool invocations is the stable path. |
| W3C AI Agent Protocol | REAL | Community Group proposed May 8, 2025. First meeting June 18, 2025. Biweekly meetings ongoing. Working on white paper + technical specification. Ratification timeline 2026-2027 as stated. |

### Corrections Needed

| Item | Issue |
|------|-------|
| A2UI version | Spec says "v0.9" — actual version is v0.8 (Public Preview) |
| AG-UI "17 event types" | Could not confirm exact count; consider saying "multiple event types" or verify against AG-UI docs |
| MCP Apps + Shopify attribution | Spec implies Shopify co-launched MCP Apps with Anthropic. Actually, Shopify built MCP-UI independently; Anthropic's MCP Apps extension (SEP-1865) was built on "proven work from MCP-UI and OpenAI Apps SDK." They're related but distinct efforts that later converged. |

**Bottom line on protocols:** The converging architecture diagram in the spec is accurate. These are real protocols shipping in production, and the industry IS converging on declarative JSON + component catalogs + intent mediation. The spec's synthesis of this landscape is genuinely well-done.

---

## 2. Academic & Research Claims — Verification

### Verified

| Claim | Verdict | Details |
|-------|---------|---------|
| JMIR 2025 MBTI+DISC profiling | REAL | Published in JMIR Human Factors, 130 participants + 20 expert validators. Correlational analysis integrating MBTI and DISC for personalized health training. JMIR e73397 |
| 18,264 professionals cognitive function study | REAL | Published April 2025 on arXiv. 30 studies, 18,264 individuals in computer-related professions. Confirms Ni-Te, Ti-Ne, Si-Te had significantly higher representation vs general population. arXiv:2504.17248 |
| Germanakos OCUM | REAL | Panagiotis Germanakos is a real researcher. The Ontological Cognitive User Model uses RDFa-based cognitive profiling with a three-layer adaptation architecture. Published across IEEE and Springer venues. |
| FACE2FEEL | REAL | arXiv:2510.00489, published Oct 1, 2025. Emotion-aware adaptive UI using webcam-based facial expression analysis. 85.7% user engagement finding confirmed. |
| ACM DIS 2025 accessibility paper | REAL | DOI 10.1145/3715336.3735691 confirmed. Evaluated 90 AI-generated interfaces across 3 domains. Found AI tools achieve basic accessibility but rely on homogenized patterns limiting creativity. |
| Predictive Index profiles | REAL | 17 Reference Profiles confirmed. Artisan, Guardian, Operator are all real PI profiles in the "Stabilizing" group. Operator is 9.4% of profiles, Guardian 8.2% (from 10M sample). |

### Needs Correction

| Claim | Issue | Recommendation |
|-------|-------|----------------|
| HC-DRL banking study: "18.6% faster, 47.8% fewer errors, 34.9% higher satisfaction" | These exact numbers could not be traced to a specific peer-reviewed paper. An IJSAT paper discusses adaptive banking interfaces with different numbers (42% cognitive load decrease, 47.2% more completions, 36.8% time reduction). | Flag as "estimate" or find the exact paper. The directional claim (adaptive UIs improve enterprise outcomes) is well-supported, but citing these precise numbers without a traceable source weakens credibility. |
| Nuclear power plant MBTI study | Not found. Multiple searches returned no matching paper about MBTI-tailored interfaces reducing reaction times in nuclear power plant environments. This may be conflated with broader human factors research in control room design. | **Remove or replace** with the verified JMIR or Germanakos studies. |
| Nudge theory Cohen's d = 0.329, 65% significance | The actual PNAS meta-analysis (Mertens et al., 2022) reports d = 0.45 overall (95% CI [0.39, 0.52]). A second-order meta-analysis found d = 0.27 before bias correction and d = 0.004 after adjusting for publication bias. The "0.329 with 65% significance" figure doesn't match either. | Correct to d = 0.45 (Mertens et al., PNAS) and add the publication bias caveat — this is important for intellectual honesty. |
| Ni-Te 33.67%, Ti-Ne 21.73% | The arXiv paper confirms these function pairs are overrepresented but the exact percentages could not be verified from the abstract alone. | Verify against full paper or cite as "significantly overrepresented" without exact percentages until confirmed. |
| Industry 5.0 Human Digital Twin | The ScienceDirect link was not fetched but the concept is widely published in Industry 5.0 literature. | Low risk — keep as-is. |

---

## 3. Competitive Landscape

### Direct Competitors: Cognitive-Adaptive Enterprise UI

**Nobody is shipping this in production. This is the most important finding.**

| Company | What They Do | Gap vs Airlock Vision |
|---------|-------------|----------------------|
| Crystal Knows | DISC-based personality AI for sales communication. Has MCP integration (works with Claude, Cursor). Helps tailor emails/proposals to recipient personality. | Crystal personalizes communication, not interfaces. No adaptive UI rendering. No chamber/workflow model. Closest to the "personality profiling" piece but entirely sales-focused. |
| Retool / Internal.io | Internal tool builders adding AI features | No personality profiling, no adaptive rendering. AI assists with building tools, not adapting them per user. |
| ServiceNow / Salesforce | Enterprise platforms with AI agents | Adding conversational AI and agentic workflows, but no cognitive-profile-driven UI adaptation. Salesforce has Agentforce; ServiceNow has Now Assist. Both are task automation, not UI personalization. |

### CLM Competitors Adding AI

| Company | AI Features (2025-2026) | Adaptive UI? |
|---------|------------------------|--------------|
| Ironclad | Conversational search, AI agents (Intake, Redlining, Research), "Jurist" assistant. | No. Conversational AI over static UI. No personality profiling. |
| Icertis | Highest-rated CLM vendor (Gartner). AI for contract intelligence, global compliance. | No adaptive UI. Standard enterprise interface. |
| Sirion | AI-native contract intelligence | No personality profiling or adaptive rendering. |
| DocuSign CLM | AI-assisted contract analysis | Standard UI. |

**Key insight:** CLM vendors are racing to add AI agents (chat, automation, extraction) but none are rethinking the interface layer itself. Airlock's thesis that the shell should adapt to the user is genuinely differentiated.

### CLM Market Sizing

| Metric | Value | Source |
|--------|-------|--------|
| Global CLM market 2025 | $1.84B | Fortune Business Insights |
| Projected 2026 | $2.07B | Fortune Business Insights |
| Projected 2034 | $5.09B | Fortune Business Insights (11.9% CAGR) |
| Cloud CLM spend 2026 (public cos) | $8.1B | MGI Research (18% CAGR) |

> The discrepancy between Fortune BI ($2.07B) and MGI ($8.1B) likely reflects different market definitions (pure CLM software vs broader contract management spend including services).

### AI Startup Funding Context (2025-2026)

- AI startups attracted 33% of total VC funding in 2025
- Record $238B deployed across 1,850+ deals in 2025
- Enterprise AI revenue reached $37B in 2025 (3x YoY)
- Y Combinator W26 batch includes multiple enterprise AI agent companies

### CLM Competitor Funding (for investor context)

- Ironclad: $333M raised, $3.2B valuation
- Icertis: $295M raised, $5B valuation
- LinkSquares: $100M Series C

### Adjacent Market Sizing

- Low-Code/No-Code platforms TAM: ~$26B (2023), projected ~$65B by 2027 (Gartner) — closest proxy for "adaptive enterprise UI"
- AI in Enterprise Software: ~$6B (2023), projected ~$30B+ by 2028

---

## 4. Risks and Contrarian Evidence

### Risk 1: MBTI Scientific Validity (HIGH)

MBTI has persistent credibility issues in organizational psychology. While the cognitive functions framework (Ni, Te, Ti, Ne) has some empirical support — the arXiv paper with 18,264 subjects is meaningful — many IO psychologists consider MBTI unreliable for individual-level prediction. The Big Five (OCEAN) model has stronger psychometric validity.

**Mitigation:** The spec wisely cross-references PI (which has stronger psychometric backing) and uses cognitive functions as a design heuristic rather than a rigid classifier. The "minimum viable personality signals" table (Section VI) is the right approach — starting with passive behavioral observation rather than requiring MBTI assessment.
**Recommendation:** Lead with PI and behavioral signals in investor conversations; position cognitive functions as the design inspiration, not the measurement instrument.

### Risk 2: Nudge Effectiveness May Be Overstated (MEDIUM)

The PNAS nudge meta-analysis (d = 0.45) has been challenged. A second-order meta-analysis found the effect drops to d = 0.004 after publication bias correction (Wiley, 2025). This doesn't mean nudges don't work — it means the measured effect sizes in published literature are likely inflated.

**Mitigation:** The positive friction framework doesn't depend on nudge theory alone. Chamber-specific friction (System 1/2 zones) is grounded in Kahneman's dual-process model, which is well-established.
**Recommendation:** Frame friction as "decision architecture" rather than "nudging" and cite the Kahneman framework rather than nudge meta-analyses.

### Risk 3: Complexity and Timeline (HIGH)

12-18 milestones is 6-18 months of work depending on cadence. Phases 4-6 (behavioral signals, lenses, assessment) are the highest-value differentiation but also the most research-heavy. Risk of building an impressive component registry (Phase 1-2) without ever reaching the adaptive intelligence (Phase 4-6) that makes the thesis unique.

**Recommendation:** Consider whether Phase 4 (behavioral signals) can be pulled earlier — even passive observation (navigation patterns, dwell times) doesn't require the full assessment engine and would start generating the data needed to prove the thesis.

### Risk 4: No One Has Proven Adaptive Enterprise UI Works at Scale

The HC-DRL banking study, Germanakos OCUM, and FACE2FEEL are all research prototypes, not production systems. No enterprise platform has shipped personality-adaptive UI and published outcomes data. Airlock would be first — which is either a massive opportunity or a sign the market hasn't validated this.

**Mitigation:** The converging protocol stack (A2UI + AG-UI + MCP Apps) makes the rendering infrastructure dramatically easier than it was 2 years ago. The hard part isn't rendering adaptive UI anymore — it's building the cognitive profiling and optimization loop. That's where the moat is.

### Risk 5: Psychometric Data & Privacy

Psychometric data raises GDPR/privacy questions in EU markets. Proving ROI requires measurable productivity gains — build the measurement infrastructure early.

---

## 5. Implications for Airlock

### What the Spec Gets Right

1. **Protocol synthesis is excellent.** The six-protocol table is accurate and the convergence analysis is spot-on. This is a well-researched landscape view.
2. **Three-tier guardrail model** (catalog constraint, schema validation, intent mediation) perfectly mirrors what A2UI, Tambo, and Shopify MCP-UI have independently converged on.
3. **Conductor role is genuinely novel.** No competitor has a role dedicated to configuring AI-driven UI for other users. This maps well to real enterprise behavior (team leads who configure dashboards for their teams).
4. **Assessment flywheel** (Assess → Place → Equip → Observe → Optimize → Re-place) is the strongest differentiator if it can be built and proven.

### What Needs Tightening

1. **Fix the statistics.** Several numbers are imprecise or untraceable. In an investor context, one debunked stat undermines the rest. See correction table in Section 2.
2. **Remove the nuclear power plant claim** until a source is found.
3. **Lead with PI over MBTI** in external-facing materials. PI has enterprise credibility; MBTI has baggage.
4. **Acknowledge the publication bias problem** in nudge theory. Frame friction as "decision architecture" instead.

---

## 6. Recommendation

**Build Phase 1 now.** The component registry enrichment and TriptychLayout slot abstraction have zero dependency on unproven science. They make the codebase better regardless of whether cognitive profiling pans out.

**Prioritize passive behavioral signals (from Phase 4) as early as Phase 2.** Even simple telemetry (which panel users spend time in, search vs browse ratio, information density preference) starts building the dataset needed to prove the adaptive thesis. You don't need the full assessment engine to start learning.

**For investor conversations:** Lead with the protocol convergence (A2UI + AG-UI + MCP Apps proving the architecture), the CLM market gap (no adaptive UI in any competitor), and the Conductor role (novel organizational concept). The cognitive profiling is the long-term moat but it's Phase 4-6 — don't let it overshadow what's buildable now.

**The whitespace is real.** Crystal Knows does personality for communication. Nobody does personality for interfaces. The protocols are ready. The science is directionally sound (with caveats). Build it.

---

## Sources

### Protocols
- Google A2UI announcement
- A2UI GitHub
- AG-UI Protocol Docs / AG-UI GitHub
- MCP Apps Blog Post (Nov 2025) / MCP Apps Launch (Jan 2026)
- Shopify MCP-UI Engineering
- shadcn CLI 3.0 + MCP Server
- Tambo GitHub
- Vercel AI SDK RSC Paused (GitHub Discussion #3251)
- W3C AI Agent Protocol CG
- Microsoft AG-UI Integration

### Research
- Cognitive Functions in Tech Careers (arXiv:2504.17248)
- JMIR MBTI+DISC Profiling (e73397)
- Nudge Meta-Analysis (PNAS, Mertens et al. 2022)
- Nudge Publication Bias (Wiley 2025)
- FACE2FEEL (arXiv:2510.00489)
- ACM DIS 2025 Accessibility (DOI 10.1145/3715336.3735691)
- Germanakos OCUM (Springer)
- PI Reference Profiles

### Market
- CLM Market Size (Fortune Business Insights)
- CLM Buyer's Guide (MGI Research)
- Ironclad AI Agents Launch
- Crystal Knows Personality AI
- AI Funding Trends 2025 (Crunchbase)
- The New Stack: Agent UI Standards
