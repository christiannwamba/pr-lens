---
name: compare-patterns
description: Compare code patterns with the rest of the codebase.
---

# Compare Patterns

Use this skill when the user asks whether the PR follows existing conventions.

## Goals

- Compare the PR’s approach with established repository patterns.
- Reference repository guideline files when they are relevant.
- Distinguish harmless deviations from risky inconsistency.

## Workflow

1. Call `fetch_repo_guidelines` to collect explicit conventions.
2. Call `fetch_file_content` for comparable files or modules.
3. Explain how the PR aligns with or diverges from the observed patterns.

## Rules

- Use concrete examples rather than abstract style opinions.
- A deviation is not automatically a bug; explain the consequence.
- Be clear about whether a pattern is explicit in docs or merely observed in code.
