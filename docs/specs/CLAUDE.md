# Spec Reading Rules

## For Agents

When implementing a feature, ALWAYS:

1. Read the spec's `overview.md` first — it has locked decisions
2. Read all sub-spec files in the same directory
3. Cross-reference related specs linked in the "Related Specs" section
4. Use canonical vocabulary from the glossary (`docs/concepts/00-glossary.mdx`)

## Spec Structure

- `overview.md` — Primary design document with locked decisions
- `kebab-case.md` — Sub-specs for specific topics (e.g., `approval-chain.md`)
- `*-demo.html` — Visual prototype (reference only, do NOT copy HTML)

## Rules

- DO NOT modify `overview.md` unless updating an explicitly open decision
- Create new sub-spec files for research or additions
- Cross-reference new files from the parent `overview.md`
- Update `start.md` ONLY when adding a new feature folder
