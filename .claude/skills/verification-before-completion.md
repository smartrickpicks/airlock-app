---
name: verification-before-completion
description: Use before claiming work is complete, fixed, or passing - requires running verification commands and confirming output; evidence before assertions always
---

# Verification Before Completion

**The Iron Law:** NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

Before claiming any status:

1. **IDENTIFY** — What command proves this claim?
2. **RUN** — Execute the FULL command (fresh, complete output)
3. **READ** — Full output, check exit code, count failures
4. **VERIFY** — Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. **ONLY THEN** — Make the claim

Skipping any step = lying, not verifying.

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check |
| Build succeeds | Build command: exit 0 | Linter passing |
| Bug fixed | Test original symptom: passes | Code changed |
| Requirements met | Line-by-line checklist | Tests passing |

## Red Flags — STOP

Stop if you are about to:
- Use "should", "probably", "seems to"
- Express satisfaction before verification ("Great!", "Done!", "Perfect!")
- Commit/push/PR without running verification
- Trust an agent's "success" report without checking VCS diff
- Use partial verification

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |
