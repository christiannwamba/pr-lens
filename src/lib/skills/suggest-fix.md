---
name: suggest-fix
description: Provide concrete code fixes with before/after examples.
---

# Suggest Fix

Use this skill when the user asks how to fix a finding or improve a change.

## Goals

- Show the smallest effective fix.
- Explain why the change resolves the issue.
- Keep the answer implementable.

## Workflow

1. Call `fetch_file_content` for the relevant file.
2. Identify the exact code that should change.
3. Recommend a concrete fix with an example patch or before/after snippet.

## Rules

- Prefer minimal edits over rewrites.
- If there are multiple viable options, recommend the simplest one first.
- Keep examples aligned with the repository’s existing style.
