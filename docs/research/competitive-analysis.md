# Airlock Competitive Analysis
> **Date:** 2026-03-06
> **Source:** Perplexity Deep Research (14 competitors, 58 features, 9 categories)
> **Status:** Raw research findings — feeds into MVP roadmap and spec decisions

---

## Summary Stats

| Dimension | Value |
|---|---|
| Total Tools Analyzed | 14 competitors |
| Feature Categories Compared | 58 features across 9 categories |
| Unique Airlock Advantages | 14 unique advantages |
| Critical Feature Gaps | 10 must-have features |
| Phase 1 MVP Features | 6 foundation features (3 months) |
| Target Cost Savings | 30–50% ($40–70/user vs $85–150) |
| PageIndex Accuracy | 98.7% on FinanceBench (SOTA) |
| Target Market | Entertainment industry |
| Launch Timeline | Phase 1: 3mo → Phase 2: 3mo → Phase 3: 6mo |

---

## Vision Synthesis

Building a **"unified workspace flywheel"** combining:
- Discord/Slack channel architecture (permission-based, omni-channel)
- CRM pipeline management (sales lifecycle tracking)
- Task/project management (assignment, to-dos, tracking)
- Document intelligence (PageIndex RAG, contract processing)
- AI agents as moderators/quality gatekeepers
- Calendar & meeting coordination
- Standards-based quality control
- ERP partnership for financial execution

**Core insight:** Not competing with each tool individually — competing with the **integration tax** of using 8+ tools together. Moat = unified intelligent workspace with cognitive load reduction.

---

## Competitive Positioning Matrix

| Competitor Stack | Cost/User/Mo | Airlock Advantage |
|---|---|---|
| Slack + Asana + Salesforce | $85–150 | Unified workspace, 1 tool |
| Slack + Jira + HubSpot | $70–120 | Better document intelligence |
| ClickUp + Slack + Zoom | $50–80 | AI standards enforcement |
| Notion + Slack + CRM | $60–100 | Reasoning-based RAG (98.7% accuracy) |

**Pricing sweet spot:** $40–70/user/month (30–50% savings + better UX)

---

## Tool Profiles

### Salesforce
- **Category:** CRM
- **Primary Function:** End-to-end sales pipeline & customer relationship management
- **Data Entry:** Lead capture (forms, marketing, manual), Contact creation, Opportunity creation, Account data, Activity logging
- **Lifecycle:** Lead Generation → MQL → SAL → SQL → Opportunity (Prospecting/Qualification/Proposal/Negotiation) → Closed Won/Lost → Post-Purchase (Onboarding/Renewal/Upsell)
- **Core Features:** Pipeline visualization, Lead scoring, Opportunity tracking, Account/Contact management, Sales forecasting, Automated workflows, Territory management, CPQ, Analytics/reporting, Mobile
- **Missing:** Native project task management, Built-in document collaboration, Native video conferencing
- **AI:** Einstein AI — lead scoring, predictive forecasting, opportunity insights, next-best-action, email intelligence
- **Unique Value:** Industry standard CRM. Deepest feature set and ecosystem. Full sales-to-service lifecycle with robust automation.

### HubSpot
- **Category:** CRM
- **Primary Function:** Inbound marketing & sales CRM with free tier
- **Data Entry:** Website forms, Email tracking, Manual entry, Import, Chat, Social media, Marketing automation
- **Lifecycle:** Stranger → Visitor → Lead → MQL → SQL → Opportunity → Customer → Evangelist
- **Core Features:** Contact/Company/Deal management, Email tracking, Meeting scheduling, Pipeline management, Email sequences, Live chat, Marketing automation, Landing pages, Workflows, Reporting
- **Missing:** Advanced territory management (paid only), Complex CPQ (needs apps), Deep customization limits on free tier
- **AI:** Content Assistant, Predictive lead scoring, ChatSpot (conversational CRM), Forecasting AI, Email send time optimization
- **Unique Value:** Free CRM tier with rich features. Tight marketing-sales alignment. Easy for SMBs.

### Jira
- **Category:** Project Management
- **Primary Function:** Agile software development & issue tracking
- **Data Entry:** Issue creation (manual, email, API), Sprint planning, Backlog grooming, Git commits (auto-link), Import from CSV/Trello
- **Lifecycle:** Backlog → To Do → In Progress → Code Review → Testing/QA → Done → Released. Epic → Story → Task → Sub-task hierarchy.
- **Core Features:** Issue tracking, Sprint management, Kanban/Scrum boards, Burndown charts, Velocity, Roadmaps, Release management, Custom workflows, Time tracking, Agile reporting
- **Missing:** Poor for non-technical teams, Complex UI, Limited resource management, No financial/budget tracking
- **AI:** Limited native (mainly marketplace apps), Atlassian Intelligence for summarization (rolling out)
- **Unique Value:** Industry standard for software teams. Deep agile support. Excellent developer tool integration.

### Asana
- **Category:** Project Management
- **Primary Function:** General work & project management for all teams
- **Data Entry:** Task creation (manual, email, form), Project templates, CSV import, Mobile task capture
- **Lifecycle:** Ideation/Planning → Task Assignment → In Progress → Review/Approval → Complete → Project Close
- **Core Features:** Task management, Multiple views (list/board/timeline/calendar/Gantt), Subtasks, Custom fields, Task dependencies, Workload view, Basic time tracking, Portfolio management, Forms, Automation rules, Templates
- **Missing:** Limited financial management, No native invoicing, Basic time tracking (no timers in free), No native document collaboration
- **AI:** Smart Goals, Workflow automation suggestions, Smart Answers (AI assistant for project Q&A)
- **Unique Value:** Clean, intuitive interface. Good middle ground between Trello and Jira. Strong for non-technical teams.

### Trello
- **Category:** Project Management
- **Primary Function:** Visual kanban-style task & project boards
- **Data Entry:** Card creation (manual, email, Butler automation), Board templates, Import from Jira (limited)
- **Lifecycle:** Ideas/Backlog → To Do → Doing → Done (fully customizable columns)
- **Core Features:** Kanban boards, Cards with checklists, Labels/tags, Due dates, Attachments, Card templates, Butler automation, Power-Ups, Calendar/Timeline views (Premium), Board templates
- **Missing:** Very limited reporting, No native time tracking, No Gantt charts (needs Power-Up), Weak for complex dependencies, No built-in resource management
- **AI:** Butler automation (rule-based, not true AI). Limited AI vs competitors.
- **Unique Value:** Simplest, most visual interface. Perfect for small teams and personal productivity. Fast setup.

### ClickUp
- **Category:** Project Management
- **Primary Function:** All-in-one work management (hyper-customizable)
- **Data Entry:** Task creation, Multiple import sources (CSV, Trello, Asana, Jira), Forms, Email, Docs, Chat messages
- **Lifecycle:** Backlog/Ideas → To Do → In Progress → Review → Complete → Archived (fully customizable)
- **Core Features:** 15+ views (List/Board/Gantt/Timeline/Calendar/Workload/etc.), Time tracking with timers, Goals & OKRs, Docs & wikis, Whiteboards, Mind maps, Automations, Custom fields, Dashboards, Resource management, Dependencies, Sprint management
- **Missing:** Can be slow/buggy, Overwhelming complexity, Steep learning curve, Limited financial features
- **AI:** ClickUp Brain — AI writing assistant, AI project manager, AI knowledge base search, task auto-generation, doc summarization
- **Unique Value:** Everything all-in-one. Most customizable PM tool. Feature-rich but complex.

### Slack
- **Category:** Communication
- **Primary Function:** Team messaging & collaboration hub
- **Data Entry:** Messages in channels/DMs, File uploads, App integrations posting data, Workflow automation triggers
- **Lifecycle:** Onboarding → Discovery (find channels) → Collaboration (messaging, huddles) → Knowledge Building (canvas, search) → Automation (workflows)
- **Core Features:** Channels (public/private), DMs, Threads, File sharing, Search, 4000+ integrations, Slack Connect (external orgs), Canvas (docs), Clips (video messages), Workflows (no-code automation), Huddles, Screen sharing, Emoji reactions
- **Missing:** No native project management, No task assignments, No time tracking, Canvas is basic (not a doc editor), No email integration inbox
- **AI (2026):** Slack AI (all paid plans) — Channel/thread summaries, Huddle notes & transcription (auto-generated canvas), Search recaps, Daily digest. Agentforce AI agents deployable as coworkers.
- **Unique Value:** Central hub for team communication. 4000+ integrations = connective tissue for workflows. Canvas + AI notes bridge async and sync work.

### Discord
- **Category:** Communication
- **Primary Function:** Community & team voice/video/text chat
- **Data Entry:** Text messages, Voice/video in channels, File uploads, Bot commands, Screen sharing
- **Lifecycle:** Server Creation → Channel Setup → Role/Permission Configuration → Member Onboarding → Ongoing Collaboration → Moderation
- **Core Features:** Text/voice/video channels, Roles & permissions (granular), Bots & automation, Screen sharing, Stage channels, Threads, Forums, Server templates, Mobile apps
- **Missing:** No project management, No task tracking, No file organization system, Limited search vs Slack, No enterprise security certifications
- **AI:** Third-party bots (ChatGPT bot, Midjourney bot). No native enterprise AI features.
- **Unique Value:** Best voice quality. Granular permission system. Server-based architecture ideal for communities with complex hierarchies.

### Google Meet
- **Category:** Video Conferencing
- **Primary Function:** Enterprise video conferencing (Google Workspace)
- **Data Entry:** Calendar events auto-create meetings, Instant meetings, Gmail integration, Meet hardware
- **Lifecycle:** Meeting Scheduling (Calendar) → Pre-join (waiting room) → Active Meeting → Recording (saved to Drive) → Post-meeting (transcripts, attendance)
- **Core Features:** HD video (up to 500 participants), Screen sharing, Live captions, Breakout rooms, Polls, Q&A, Hand raising, Backgrounds, Noise cancellation (AI), Recording (saves to Drive), YouTube live streaming, Meet hardware support
- **Missing:** No self-hosting, Requires Google account for full features, 60-min limit on free tier
- **AI:** Live captions (multi-language), Noise cancellation, Background blur/replacement, Companion mode (AI meeting assistant)
- **Unique Value:** Best-in-class Google Workspace integration. Enterprise-grade with professional features.

### Jitsi Meet
- **Category:** Video Conferencing
- **Primary Function:** Open-source video conferencing (self-hostable)
- **Data Entry:** URL-based instant meetings (no account), Embeddable in websites, API integration
- **Lifecycle:** Meeting Creation (instant, no login) → Join (one-click) → Active Meeting → Recording (via Jibri if self-hosted) → End
- **Core Features:** Unlimited participants (self-hosted), HD video, Screen sharing with audio, Chat, Reactions, Virtual backgrounds, YouTube live streaming, Recording (with Jibri), E2E encryption, Custom branding, No account required
- **Missing:** Limited built-in features vs commercial tools, No breakout rooms (self-hosted setup complex), No polls/Q&A, Weaker mobile experience, No live captions
- **AI:** None native (third-party AI bots can be integrated if self-hosted)
- **Unique Value:** Open-source and self-hostable. Complete data sovereignty. Free unlimited use. No vendor lock-in.

### Motion
- **Category:** Calendar / Productivity AI
- **Primary Function:** AI-powered calendar & task scheduler
- **Data Entry:** Tasks (manual or AI chat), Calendar sync (Google/Outlook), Projects, Meeting bookings
- **Lifecycle:** Task Input → AI Auto-Scheduling (priorities, deadlines, duration) → Calendar Time-blocking → Execution (day planner) → Auto-Rescheduling → Completion Tracking. Continuous optimization.
- **Core Features:** AI task scheduler (auto time-blocks), Calendar integration (Google/Outlook/iCloud), Meeting scheduler (like Calendly), Daily AI planner, Project management boards, Task prioritization, Auto-rescheduling, Meeting Defender (protects focus time), AI Chat, Team workload view
- **Missing:** Limited collaboration vs dedicated PM tools, No native document collaboration, Expensive, Limited integrations
- **AI:** Core product IS AI — auto-scheduling, task prioritization, meeting optimization, AI Notetaker (transcription), AI Chat (natural language task creation), AI Docs & Sheets, Daily agenda generation
- **Unique Value:** AI that actually schedules your day for you. Combines calendar + tasks + projects. Ideal for busy professionals.

### Aligned
- **Category:** Sales Collaboration
- **Primary Function:** Digital sales rooms & buyer collaboration (B2B)
- **Data Entry:** Deal creation (from CRM sync), Content uploads, Mutual action plans, Stakeholder mapping, Call/meeting notes
- **Lifecycle:** Deal Creation → Digital Sales Room Setup → Buyer Collaboration → Stakeholder Engagement Tracking → Risk Detection → Close → Customer Success Handoff
- **Core Features:** Digital sales rooms (buyer-facing workspaces), Mutual action plans, Content management, Stakeholder mapping, Buyer engagement analytics, Task tracking (buyer + seller), CRM sync (HubSpot, Salesforce), Email integration, Live chat/discussions, Custom branding, Templates
- **Missing:** Not a CRM replacement (needs integration), Limited project management, No native video conferencing
- **AI (2026):** AI Deal Workspace — auto-generates executive summaries, action items from calls, risk detection, stakeholder recommendations, business case generation, follow-up email drafts, AI buyer assistant (in workspace)
- **Unique Value:** First true "system of action" for sales. Bridges CRM and buyer. Reduces friction in complex B2B deals. Mutual accountability.

### Google Docs/Sheets/Slides
- **Category:** Google Workspace
- **Primary Function:** Cloud-based document collaboration suite
- **Data Entry:** Manual document creation, Import (Word, Excel, PowerPoint), Google Drive sync, Form responses (Sheets), Email attachments
- **Lifecycle:** Creation → Drafting/Editing (real-time collaboration) → Commenting/Suggesting → Review/Approval → Publishing/Sharing → Version History
- **Core Features:** Real-time collaboration, Comments & suggestions, Version history, Share permissions, Templates, Add-ons/Extensions, Mobile apps, Offline mode, Smart Compose/Reply (AI), Explore (AI research), Voice typing, Macros (Sheets)
- **Missing:** Less formatting control vs Microsoft Office, Limited offline, No native project management
- **AI:** Smart Compose, Smart Reply, Explore (AI research in Docs), Auto-fill patterns (Sheets), Design ideas (Slides), Grammar suggestions
- **Unique Value:** Industry standard for collaborative document editing. Real-time co-authoring. Ubiquitous in business and education.

### NotebookLM
- **Category:** Google Workspace
- **Primary Function:** AI research & learning assistant (document analysis)
- **Data Entry:** Upload sources: PDFs, Google Docs, Google Slides, websites, YouTube videos, Audio files
- **Lifecycle:** Notebook Creation → Source Upload (up to 50 sources) → AI Analysis & Briefing Doc Generation → Q&A with Sources → Content Creation (summaries, slide decks, podcasts) → Gemini Integration
- **Core Features:** Multi-source analysis (50 docs/notebook), AI-generated briefing docs, Source-grounded Q&A (citations), Audio Overviews (AI podcast generation), Note-taking, Notebook sharing, Customizable AI style, Studio: Auto-generate slide decks, infographics, tables
- **Missing:** No project management, No task tracking, No real-time collaboration (async only), Limited to document analysis (no creation from scratch), Cannot train on your data
- **AI:** CORE PRODUCT — Multimodal AI (text, audio, video), Grounded generation (cites sources), Audio Overviews (podcast synthesis), Slide deck auto-generation, Gemini integration for enhanced reasoning, Custom response styles
- **Unique Value:** Best-in-class document synthesis with source grounding. No hallucinations (cites actual sources). Unique audio overview feature. Free for all users.

---

## Feature Matrix (Airlock vs Competition)

Legend: ✅ Full support | ⚠️ Partial/via apps | ❌ Not available | 🚧 Airlock planned

### Document Intelligence
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Reasoning-based RAG | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Contract extraction/analysis | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ |
| Document hierarchy preservation | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| OCR with context | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Source-grounded AI (no hallucinations) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

### CRM & Sales Pipeline
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lead/Contact management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🚧 |
| Opportunity/Deal pipeline | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🚧 |
| Sales forecasting | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚧 |
| Email tracking/sequences | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | ❌ | 🚧 |
| Lead scoring | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Project & Task Management
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Visual task boards (Kanban) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | 🚧 |
| Task dependencies | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | 🚧 |
| Sprint/Agile management | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gantt charts/Timeline | ❌ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚧 |
| Workload/Resource management | ⚠️ | ❌ | ⚠️ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 🚧 |
| Time tracking | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Automated task assignment | ✅ | ✅ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | 🚧 |

### Communication & Collaboration
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Real-time messaging/channels | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | 🚧 |
| Threaded conversations | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | 🚧 |
| @mentions & notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | 🚧 |
| Video conferencing | ❌ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | 🚧 |
| Screen sharing | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | 🚧 |
| Document collaboration | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | 🚧 |

### Calendar & Scheduling
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Calendar integration | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ❌ | 🚧 |
| Meeting scheduling | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ | ❌ | ✅ | ❌ | 🚧 |
| AI auto-scheduling | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Time blocking | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 🚧 |

### AI & Automation
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI assistant/copilot | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Workflow automation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | 🚧 |
| Predictive analytics | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🚧 |
| AI content generation | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ❌ | 🚧 |
| AI meeting notes/summaries | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | 🚧 |
| Standards enforcement (AI) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### Permissions & Access Control
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Granular role-based access | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ✅ | ✅ | ❌ | ❌ | 🚧 |
| Channel-based permissions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| External user access | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | 🚧 |

### Integrations & Extensibility
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| API access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | 🚧 |
| Integration marketplace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | ❌ |
| Webhook support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | 🚧 |

### Data & Reporting
| Feature | Salesforce | HubSpot | Jira | Asana | Trello | ClickUp | Slack | Motion | Aligned | Google Docs | NotebookLM | Airlock Current | Airlock Planned |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Custom dashboards | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ⚠️ | ✅ | ❌ | ❌ | ❌ | 🚧 |
| Export capabilities (CSV/Excel) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ❌ | ✅ | ❌ | 🚧 |
| Custom reports | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🚧 |
| Audit logs | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ✅ | ✅ | ❌ | 🚧 |

### Unique Airlock Features
| Feature | All Competitors | Airlock Current | Airlock Planned |
|---|---|---|---|
| Slash commands for universal recall | ❌ (⚠️ Slack only) | ❌ | ✅ |
| AI gate checking/quality control | ❌ | ✅ | ✅ |
| Omni-channel routing (internal+external) | ❌ (⚠️ Aligned only) | ❌ | ✅ |
| E-signature annotation layer | ⚠️ (Salesforce/HubSpot via apps) | ❌ | ✅ |
| ERP integration for contract execution | ⚠️ (Salesforce/HubSpot via apps) | ❌ | ✅ |

---

## MVP Feature Priority Roadmap

### Phase 1: Foundation (Months 1–3) — "Make it work together"

**Critical path — must have for demo:**

1. **Channel Architecture (Discord-inspired)**
   - Text channels, permission-based access (role hierarchy), @mentions, threading, file attachments, channel categories/folders
   - Gap filled: Slack channels

2. **Slash Commands System**
   - `/find [document query]` → PageIndex search
   - `/task [create/list/assign]` → Task management
   - `/schedule [meeting]` → Calendar action
   - `/contact [name]` → CRM lookup
   - Gap filled: Unique to Airlock

3. **Task Management in Channels**
   - Create tasks from messages, assign to channel members, task status updates in channel, task list view per channel, due dates & priorities
   - Gap filled: Asana/Trello basic functionality

4. **Document Intelligence Integration**
   - Upload documents to channels, PageIndex auto-indexing, slash command retrieval, contract extraction showcase, source-grounded answers
   - Gap filled: NotebookLM + enterprise docs

5. **Basic CRM Objects**
   - Contact records, Company/Account records, Deal/Opportunity records, link CRM records to channels
   - Gap filled: Salesforce/HubSpot core objects

6. **AI Agent Gatekeeper (MVP)**
   - Document quality checker (before commit), task validation, standards library (configurable rules), flag violations (not block) in MVP
   - Gap filled: Unique to Airlock

### Phase 2: Differentiation (Months 4–6) — "Make it intelligent"

7. **Omni-Channel Routing** — Public-facing channels, AI routing agent (intent detection), deterministic rules engine
8. **Calendar & Meeting Integration** — Google Calendar/Outlook sync, schedule via slash command, meeting channels, agenda management
9. **Workflow Automation Engine** — Triggers/actions/conditions, template workflows (built-in Zapier equivalent)
10. **Advanced Task Views** — Kanban (Trello-style), List (Asana-style), Calendar/Timeline, My Tasks dashboard
11. **Pipeline Management (CRM)** — Visual pipeline with drag-drop, win/loss reasons, revenue forecasting

### Phase 3: Scale & Polish (Months 7–12) — "Make it enterprise-ready"

12. **Video Conferencing Integration** — Jitsi Meet embedded, start call from channel, recording → auto-upload to channel, AI meeting notes → post to channel
13. **E-Signature & Contract Execution** — Annotation layer on PDFs, approval workflow, ERP integration for payment execution
14. **Analytics & Reporting** — Channel activity dashboards, CRM pipeline reports, task completion metrics, AI gatekeeper violation reports
15. **Mobile Apps (iOS/Android)**
16. **Advanced Permissions** — Custom roles, document-level access, guest user management, external org collaboration
17. **Integration Marketplace (Future)** — Public API, webhook support, OAuth for third-party apps

---

## Expand from Demo

### Document Processing
Current: PageIndex vectorless RAG, OCR, tree structure
Add:
- Collaborative annotation (highlight, comment)
- Version control (track changes to contracts)
- Comparison view (diff between contract versions)
- Bulk document processing (upload folder)
- Custom extraction templates (per contract type)

### AI Agents
Current: Standards enforcement concept
Add:
- Multiple agent types (moderator, assistant, analyst)
- Agent training on org-specific standards
- Agent handoff (escalate to human)
- Agent audit log (decisions made)
- Conversational AI for external customers

### Search
Current: Slash command document search
Add:
- Universal search (documents + messages + tasks + contacts)
- Semantic search across all content
- Search filters (date, author, channel, type)
- Saved searches
- Search analytics (what people can't find)

### Notifications & Activity
Current: Not defined
Add:
- @mentions, task assignments, document updates
- Channel activity digest
- Customizable notification preferences
- Do Not Disturb mode

---

## Go-to-Market Strategy

**Beachhead:** Entertainment Industry (Production Companies, Agencies, Labels)

Why perfect fit:
- Contract-heavy (PageIndex + e-signature strength)
- Complex deal structures (CRM need)
- Cross-functional teams (producers, legal, finance, talent)
- High coordination needs (calendars, tasks, communication)
- Relationship-driven (omni-channel customer engagement)

**3-Minute Demo Sequence:**
1. **Show the problem** (15s) — "Most teams use 8+ tools. Here's the context switching."
2. **Unified workspace** (30s) — Show: Messages, tasks, documents, calendar in one view
3. **Slash commands magic** (45s) — `/find talent contract with Tom Hanks clause 7` → PageIndex retrieves exact section (show reasoning path)
4. **AI gatekeeper** (30s) — Upload contract with missing clause → AI flags "Standard clause X missing, cannot commit"
5. **Omni-channel** (30s) — External message comes in, AI routes to correct deal channel
6. **Close** (30s) — "All your tools in one workspace. Better UX. Lower cost. AI quality control."

---

## Hypothesis Metrics

| Metric | Target |
|---|---|
| Click Ratio (actions per completed task) | 50% reduction vs 3-tool stack |
| Context Switches (tool switches per session) | 80% reduction (8 tools → 1) |
| Time to Information (seconds to find document/contact/task) | 10× faster with slash commands + PageIndex |
| AI Accuracy (standards violations caught before commit) | 95% accuracy |
| Collaboration Velocity (task creation → completion) | 30% faster |

---

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Feature parity trap | Focus on vertical (entertainment) + unique moats (PageIndex, AI gates) |
| Integration dependencies | Phase 1 = manual entry. Phase 2 = sync. Phase 3 = bi-directional. |
| Enterprise sales cycle too long | Freemium tier (5 users, limited channels). Land & expand. |
| Slack/Microsoft Teams distribution | Win on vertical expertise (entertainment contracts) they can't match. |
| PageIndex accuracy drops on non-financial docs | Train on entertainment contracts. Show 95%+ accuracy on domain. |
