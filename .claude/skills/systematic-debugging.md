---
name: systematic-debugging
description: Use when diagnosing bugs, errors, or unexpected behavior - enforces root cause investigation before any fix attempt, no guessing allowed
---

# Systematic Debugging

**Core principle:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

## Four-Phase Framework

### Phase 1: Root Cause Investigation
- Read error messages carefully
- Reproduce the issue consistently
- Check recent changes (git log, git diff)
- Gather diagnostic evidence across system components
- Add instrumentation at each boundary to locate the failure point

### Phase 2: Pattern Analysis
- Find working examples similar to the broken case
- Compare working vs broken code
- Identify ALL differences, however small

### Phase 3: Hypothesis and Testing
- Form ONE specific hypothesis
- Test it minimally (change one variable at a time)
- Verify the result before forming the next hypothesis

### Phase 4: Implementation
- Write a failing test case first (proves the bug exists)
- Implement a single fix
- Verify the fix works

**If three or more fix attempts fail:** Question the architectural approach. Don't patch symptoms.

## Critical Red Flags

**STOP** if you are about to:
- Propose a fix without completing Phase 1-2
- Make multiple simultaneous changes
- Skip writing a failing test
- Attempt the same fix a fourth time

## Why This Works

Systematic debugging is faster than guess-and-check, especially under time pressure when shortcuts are most tempting. The investigation phase saves more time than it costs.
