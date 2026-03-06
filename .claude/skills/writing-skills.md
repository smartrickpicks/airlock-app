---
name: writing-skills
description: Use when creating new reusable skill documentation - applies TDD principles to skill authoring with RED (baseline), GREEN (minimal doc), REFACTOR (close loopholes) phases
---

# Writing Skills

Writing skills applies TDD principles to process documentation.

**Absolute rule:** NO SKILL WITHOUT A FAILING TEST FIRST. Document how agents behave WITHOUT the skill before writing it (RED phase).

## Skill File Requirements

- Location: `.claude/skills/<skill-name>.md`
- YAML frontmatter with `name` and `description` only (max 1024 chars total)
- Description must answer "Should I read this skill right now?" — starts with "Use when..." with specific triggering conditions
- Never summarize the skill's workflow in the description (agents follow description instead of reading the skill)

## Skill Body Structure

1. Overview / core principle
2. When to use (and when NOT to)
3. Core patterns / process steps
4. Quick reference (table or checklist)
5. Common mistakes
6. Red flags — Never section
7. Integration (called by / pairs with)

## Testing Methodology by Skill Type

- **Discipline-enforcing skills** (TDD, debugging): Test with pressure scenarios (time constraints, sunk costs, exhaustion)
- **Technique skills**: Test application to new scenarios and edge cases
- **Pattern skills**: Test recognition and appropriate application boundaries

## RED-GREEN-REFACTOR for Skills

**RED:** Run baseline scenarios. Document exact rationalizations agents use to avoid compliance.
**GREEN:** Write minimal skill addressing those specific failures.
**REFACTOR:** Close new loopholes discovered during testing. Add to rationalization table and red flags.

## Token Efficiency

- Frequently-loaded skills: stay under 200 words total
- Move heavy reference material to separate files
- Use cross-references instead of repetition
- Active verb names: `condition-based-waiting` not `async-test-helpers`
