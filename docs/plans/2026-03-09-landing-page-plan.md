# Landing Page Implementation Plan

> Date: 2026-03-09
> Domain: doyoulikedags.xyz
> Stack: Next.js 14 + Tailwind + Framer Motion
> Hosting: Vercel (free tier)
> Repo: Separate repo (airlock-landing)

---

## Phase 1: Bolt One-Shot (Frontend)

**Goal:** Bolt generates the complete landing page frontend from a single prompt.

### Deliverables

- [ ] Complete Next.js 14 project with all 8 sections
- [ ] Responsive design (mobile → desktop)
- [ ] Framer Motion scroll animations
- [ ] Email capture form (UI only, no backend)
- [ ] OLED dark theme with Airlock design tokens
- [ ] Chamber color progression through page
- [ ] Glassmorphic cards and navigation
- [ ] Sticky nav with mobile hamburger menu
- [ ] Scroll progress indicator
- [ ] SEO meta tags and Open Graph

### Files Bolt Creates

```
app/layout.tsx           — Root layout, fonts, metadata
app/page.tsx             — Landing page assembling all sections
app/globals.css          — Design tokens + Tailwind base
components/Nav.tsx       — Sticky glassmorphic navigation
components/Hero.tsx      — Hero with email capture + product preview
components/ProblemSolution.tsx
components/ChamberTimeline.tsx
components/PeopleIntel.tsx
components/Modules.tsx
components/Trust.tsx
components/FinalCTA.tsx
components/Footer.tsx
components/ScrollProgress.tsx
components/EmailCapture.tsx
lib/animations.ts        — Framer Motion variants
tailwind.config.ts       — Extended with Airlock tokens
```

---

## Phase 2: Waitlist Backend (Post-Bolt)

**Goal:** Wire up email capture to actually store signups.

### Option A: Vercel KV (Recommended)

```
npm i @vercel/kv
```

- Create `app/api/waitlist/route.ts`
- POST handler validates email, stores in Vercel KV
- Returns success/duplicate/error status
- Free tier: 256MB storage, 30K requests/day

### Option B: Resend + Vercel KV

- Same as above + send confirmation email via Resend
- Free tier: 100 emails/day (plenty for early waitlist)

---

## Phase 3: Deploy to Vercel

### Steps

1. Push repo to GitHub (`smartrickpicks/airlock-landing`)
2. Connect repo to Vercel
3. Deploy (auto-builds on push)
4. Add custom domain in Vercel dashboard

### DNS Configuration (Namecheap)

1. Namecheap → Domain List → Manage → Advanced DNS
2. Remove all existing records
3. Add:
   - A Record: `@` → `76.76.21.21`
   - CNAME: `www` → `cname.vercel-dns.com`
4. Vercel auto-provisions SSL

---

## Phase 4: Product Screenshots

**Goal:** Create realistic UI mockups for the landing page.

### Options (in order of preference)

1. **Screenshot the running app** — `pnpm dev`, navigate to key views, screenshot
2. **Figma mockups** — Create polished versions of the Triptych, Dispatch, etc.
3. **Placeholder gradients** — Glassmorphic placeholder cards with text (Bolt default)

### Key Screenshots Needed

- Dispatch view (global homepage)
- Vault detail (Triptych layout)
- Triage board (Kanban view)
- CRM pipeline
- Otto AI chat panel

---

## Timeline

| Phase                  | Effort         | Dependencies                |
| ---------------------- | -------------- | --------------------------- |
| Phase 1: Bolt frontend | 1 Bolt session | Design spec (done)          |
| Phase 2: Waitlist API  | 30 min         | Vercel KV setup             |
| Phase 3: Deploy        | 15 min         | GitHub repo, Vercel account |
| Phase 4: Screenshots   | 30 min         | Running app                 |

---

## Success Criteria

- [ ] Landing page loads in < 2s
- [ ] Lighthouse: 95+ Performance, 100 Accessibility
- [ ] Email capture works end-to-end
- [ ] Responsive on mobile, tablet, desktop
- [ ] All 8 sections render correctly
- [ ] Chamber color progression visible
- [ ] Scroll animations smooth (60fps)
- [ ] SEO meta tags present
- [ ] SSL certificate active on domain
