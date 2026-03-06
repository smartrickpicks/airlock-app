---
name: test-driven-development
description: Use when implementing new features, fixing bugs, or refactoring - enforces RED-GREEN-REFACTOR cycle, no production code without a failing test first
---

# Test-Driven Development

**Absolute rule:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

If you wrote code before the test: delete it, start over.

## The Cycle

### RED — Write a minimal failing test
- Clear name describing desired behavior
- Tests ONE thing
- Uses real code paths when possible
- **Verify it fails:** run it, confirm failure message is what you expect

### GREEN — Write the simplest code that passes
- No over-engineering
- No features beyond what the test requires
- Minimum viable implementation

**Verify it passes:** run the test. Also run the full suite — no regressions.

### REFACTOR — Clean up while tests stay green
- Remove duplication
- Improve naming
- Extract helpers if needed
- Tests must remain green throughout

## Why Order Matters

Tests written AFTER implementation pass immediately and prove nothing. They may:
- Test the wrong thing
- Miss edge cases
- Verify implementation instead of behavior

## Rationalizations to Reject

| Excuse | Reality |
|--------|---------|
| "I'll test after" | By then you've lost the spec |
| "Already manually tested" | Manual tests don't prevent regression |
| "Too simple to test" | Simple things break in complex systems |
| "Tests slow me down" | Bugs slow you down more |

## Completion Checklist

Before marking any task done:
- [ ] Every new function has a test
- [ ] Each test failed first for the expected reason
- [ ] Implementation is minimal (YAGNI)
- [ ] All tests pass
- [ ] Edge cases covered
