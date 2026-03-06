---
name: brainstorming
description: Use when designing new features, planning architecture, or exploring approaches before implementation - enforces design-first with hard gate: no coding until design is approved
---

# Brainstorming Process Guide

## Core Principle

**Hard gate:** No coding, scaffolding, or implementation occurs until a design is presented and approved. This applies universally, regardless of project complexity.

## Process Overview

Six sequential steps:

1. **Context exploration** — Review existing project files and documentation
2. **Clarifying questions** — Ask one question at a time to understand purpose and constraints
3. **Approach proposals** — Present 2-3 alternatives with trade-offs and recommendations
4. **Design presentation** — Share the design with approval checkpoints
5. **Documentation** — Save design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
6. **Implementation planning** — Invoke the writing-plans skill exclusively

## Key Guidelines

- Ask single questions per message, preferring multiple-choice formats
- Focus on understanding purpose, constraints, and success criteria
- Scale design sections to complexity (concise for simple features, detailed for nuanced ones)
- Cover architecture, components, data flow, error handling, and testing
- Propose approaches conversationally with clear reasoning for recommendations
- Validate incrementally—revise if clarification is needed before proceeding

## Important Boundaries

Only the **writing-plans skill** follows brainstorming; other implementation skills are not invoked at this stage.

The "too simple to design" anti-pattern must be resisted—even minimal projects require documented designs.

## After Approval

Invoke `using-git-worktrees` skill, then invoke `writing-plans` skill. Do not write code directly.
