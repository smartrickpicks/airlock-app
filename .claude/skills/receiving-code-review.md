---
name: receiving-code-review
description: Use when receiving code review feedback - requires technical verification before implementing suggestions, not performative agreement or blind implementation
---

# Receiving Code Review

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

1. **READ** — Complete feedback without reacting
2. **UNDERSTAND** — Restate requirement in own words (or ask)
3. **VERIFY** — Check against codebase reality
4. **EVALUATE** — Technically sound for THIS codebase?
5. **RESPOND** — Technical acknowledgment or reasoned pushback
6. **IMPLEMENT** — One item at a time, test each

## Forbidden Responses

**NEVER:**
- "You're absolutely right!" (performative)
- "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before verification)
- Any expression of gratitude

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

If ANY item is unclear: STOP, ask clarification on ALL unclear items before implementing anything. Items may be related — partial understanding = wrong implementation.

## When to Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Conflicts with architectural decisions

## GitHub Thread Replies

When replying to inline review comments on GitHub, reply in the comment thread (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), not as a top-level PR comment.
