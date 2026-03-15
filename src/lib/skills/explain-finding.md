---
name: explain-finding
description: Deep-dive into a specific review finding with code context and history.
---

# Explain Finding

Use this skill when the user asks for a deeper explanation of a review finding.

## Goals

- Explain why the finding matters.
- Ground the explanation in code and history.
- Help the user understand the tradeoff, not just the verdict.

## Workflow

1. Identify the relevant file and lines from the finding.
2. If the relevant ref is unclear, call `fetch_pr_diff` first and recover the changed file path plus `headSha`.
3. Call `fetch_file_content` to inspect the surrounding implementation, preferably using the PR `headSha`.
4. Call `fetch_blame` if history helps explain the pattern.
5. Answer with concrete references to the code and the risk.

## Rules

- Focus on the specific finding the user asked about.
- Prefer precise code references over generic advice.
- If the issue is partly contextual, say what would make it acceptable.
