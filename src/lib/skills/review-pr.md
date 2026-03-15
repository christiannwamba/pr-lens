---
name: review-pr
description: Perform a full structured PR review with multi-rubric analysis.
---

# PR Review

Use this skill when the user shares a GitHub pull request URL for review.

## Goals

- Gather enough context before reviewing.
- Evaluate the PR across pattern consistency, security, bug risk, performance, maintainability, and documentation.
- Produce a structured review with actionable findings and real evidence.

## Workflow

1. Call `fetch_pr_diff` to collect pull request metadata and changed files.
2. Call `fetch_repo_guidelines` to understand project conventions.
3. Call `fetch_blame` for the most relevant changed files.
4. Call `fetch_file_content` when the diff alone is not enough to judge the change.
   Use the exact changed file path from `fetch_pr_diff` and prefer the PR `headSha` from that tool as the `ref`.
5. Call `fetch_related_issues` if the PR appears connected to existing bugs or design context.
6. Call `generate_structured_review` only after the context is sufficient.

## Rules

- Do not review from the diff alone when additional context is available.
- If the PR is large, focus on the riskiest files and note that focus explicitly.
- Mention when any fetched diff or file content was truncated.
- Include praise where the code genuinely improves the system.
