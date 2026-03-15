---
name: explore-history
description: Analyze git blame and commit history for a file or change.
---

# Explore History

Use this skill when the user asks how a file or pattern evolved.

## Goals

- Show who changed the area, when, and how recently.
- Connect code changes to likely intent.
- Surface whether the pattern is entrenched or newly introduced.

## Workflow

1. Call `fetch_blame` for the file or area in question.
2. Call `fetch_related_issues` if there are meaningful issue keywords.
3. Summarize the relevant history and what it implies for the current PR.

## Rules

- Focus on the most relevant historical changes.
- Avoid turning blame data into speculation unless you label it as inference.
- Highlight whether the current PR continues an old pattern or introduces a new one.
