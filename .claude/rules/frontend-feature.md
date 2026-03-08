# Frontend Feature Development — Tier 2 Context

## Before You Start

1. Read the relevant spec in `airlock-docs/specs/<feature>/overview.md` (via MCP)
2. Read `airlock-docs/concepts/00-glossary.mdx` for canonical vocabulary (via MCP)
3. Read `apps/web/CLAUDE.md` for frontend conventions
4. Check `airlock-docs/registry/components.json` for existing components you can reuse (via MCP)

## Component Creation Checklist

- [ ] Determine atomic level: token / atom / molecule / organism / template / view
- [ ] Place in correct directory: `src/components/<level>/ComponentName.tsx`
- [ ] Use PascalCase for file names, kebab-case for directories
- [ ] One default export per file
- [ ] Add `'use client'` directive if using hooks, state, or browser APIs
- [ ] Use Tailwind tokens from `src/styles/tokens.css` — never raw color values
- [ ] Update `airlock-docs/registry/components.json` with the new component entry (via MCP)

## Styling Rules

- Chamber colors: Discover = red, Build = yellow, Review = purple, Ship = green
- OLED dark palette defined in `src/styles/tokens.css`
- All colors via CSS custom properties or Tailwind token classes
- Never use raw hex/rgb values — always reference tokens

## State Management (Zustand)

- `stores/module.store.ts` — active module, chamber, selected vault
- `stores/triptych.store.ts` — panel states (Overview/Inspect/Edit/Approve), widths
- `stores/auth.store.ts` — user, org role, module roles, permissions
- Create feature-specific stores in `src/features/<module>/` if needed
- Keep stores flat — no deep nesting

## Routing

- URL pattern: `/(modules)/<module>/<view-or-vaultId>`
- Module layouts: `src/app/(modules)/<module>/layout.tsx`
- Chamber views as pages: `contracts/triage/page.tsx`
- Vault detail: `contracts/[vaultId]/page.tsx` (renders Triptych)
- CRM catch-all: `crm/[...slug]/page.tsx` (react-admin, SSR disabled)

## API Integration

- Import generated client from `@airlock/shared-types`
- Never hand-write API types — they come from OpenAPI codegen
- Use `src/lib/api.ts` for API client configuration

## Testing

- Write Storybook stories before implementing components
- Per-story states: loading, empty, errored, per-gate, per-role
- Playwright for E2E testing of Views
