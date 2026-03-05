# Airlock Web — Next.js 14 (App Router)

## Rules

- **App Router only** — no Pages Router, no `getServerSideProps`
- **`'use client'`** directive required for any component using hooks, state, or browser APIs
- **Import alias** `@/*` maps to `src/*`
- **Component naming** — PascalCase files (e.g., `VaultRow.tsx`), kebab-case directories
- **One component per file** — export default, named exports for sub-components only

## Component System (Atomic-ish)

| Level        | Directory             | What Goes Here                                        |
| ------------ | --------------------- | ----------------------------------------------------- |
| `tokens/`    | Design primitives     | Tailwind config, CSS custom properties                |
| `atoms/`     | Raw visual primitives | Button, Icon, Input, Badge, Spinner                   |
| `molecules/` | Small composites      | FormRow, PillFilter, StatusChip, SearchBar            |
| `organisms/` | Business widgets      | VaultRow, ChamberColumn, GateChecklist, TriptychShell |
| `templates/` | Page layouts          | TriptychLayout, VaultListWithFilters                  |
| `views/`     | Route containers      | 1:1 with spec Views (TriageBoard, RecordInspector)    |

## Styling

- **Tailwind CSS** with custom tokens in `src/styles/tokens.css`
- **Never use raw colors** — always reference token classes
- Chamber colors: Discover=red, Build=yellow, Review=purple, Ship=green
- Theme: OLED dark palette (defined in tokens.css)

## State (Zustand)

- `module.store.ts` — active module, chamber, selected vault
- `triptych.store.ts` — panel states (Overview/Inspect/Edit/Approve), widths
- `auth.store.ts` — user, org role, module roles, permissions

## Routing

URL pattern: `/(modules)/<module>/<view-or-vaultId>`

- Module layouts in `src/app/(modules)/<module>/layout.tsx`
- Chamber views as pages: `contracts/triage/page.tsx`
- Vault detail: `contracts/[vaultId]/page.tsx` (renders Triptych)
- CRM: `crm/[...slug]/page.tsx` (react-admin catch-all, SSR disabled)
- Admin: `admin/page.tsx` (system overlay, not in modules group)

## react-admin (CRM only)

- Lives in `src/features/crm/CrmApp.tsx`
- Loaded via dynamic import with `ssr: false`
- Connected to Airlock API via custom data provider
- DO NOT use react-admin's built-in routing outside `/crm/`
