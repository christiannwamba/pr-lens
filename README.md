# PR Lens

Paste a GitHub PR URL, get a code review back. Built with Next.js, the Vercel AI SDK, and Anthropic Claude.

## The Problem

Code review matters more than most engineering activities, but it's wildly inconsistent. Reviews shift with reviewer energy, familiarity with the codebase, and how much time pressure they're under. Security gaps slip through. Subtle bugs survive. Convention drift accumulates quietly.

PR Lens gives engineering teams a reliable first pass. You paste a PR URL, the agent gathers repository context through GitHub's REST and GraphQL APIs, and returns a review with findings ranked by severity and mapped to specific files and line ranges. Each finding is evaluated against one of six rubrics: security, bug risk, performance, pattern consistency, maintainability, and documentation.

It's not a replacement for human reviewers. The AI review surfaces what to look at; the engineer decides what to do about it.

## Architecture

### Agent Orchestration

At its core, a **skill-based agent** built on the AI SDK's multi-step `streamText` with `prepareStep`. Rather than exposing all tools to the model at once, the agent follows a two-phase activation pattern:

1. **`load_skill`** — selects the right mode for the task (e.g., `review-pr`, `explain-finding`, `suggest-fix`)
2. **`search_tools`** — activates only the tools that skill needs

This keeps the tool schema surface small per step, which reduces model confusion and avoids wasted tokens describing tools the model won't use. Each skill maps to a specific subset of tools — for example, `suggest-fix` only gets `fetch_file_content`, while `review-pr` gets all six functional tools.

### Review Generation

A **sub-agent call** — a separate `generateText` invocation with its own focused system prompt and Zod schema output validation — generates the actual review. The orchestrator handles context gathering (diff, blame, guidelines, issues). The sub-agent handles evaluation. Each gets a prompt optimized for its job.

### Tool Design

Each tool is a self-contained AI SDK `tool()` with Zod-validated inputs and outputs:

- **`fetch_pr_diff`** — PR metadata + file patches (truncated at 500 lines per file to manage context budget)
- **`fetch_file_content`** — full file at a specific git ref (truncated at 500 lines)
- **`fetch_blame`** — git blame via GraphQL, with REST fallback for repos where GraphQL blame isn't available
- **`fetch_repo_guidelines`** — convention files (CONTRIBUTING.md, lint configs, tsconfig, PR templates) fetched in parallel
- **`fetch_related_issues`** — keyword search across repo issues for additional context
- **`generate_structured_review`** — sub-agent call that produces the final structured review

### Key Trade-offs

| Decision | Trade-off | Why |
|----------|-----------|-----|
| Claude Sonnet for both orchestration and review | Higher cost than Haiku for orchestration, but more reliable tool use and structured output | Sonnet's tool-calling accuracy avoids wasted retry steps that would cost more than the per-token difference |
| 500-line patch/file truncation | May miss issues in large files | Keeps context window usage predictable; the model can request specific files if the diff hints at issues beyond the truncation |
| Sub-agent for review generation | Extra API call adds latency | Dedicated prompt + schema validation produces more consistent structured output than asking the orchestrator to review inline |
| `cache: "no-store"` on all GitHub fetches | No caching, every request hits GitHub | PRs change frequently; stale data leads to wrong reviews. Caching would be appropriate for immutable refs (commits, tags) |
| `MAX_TOOL_STEPS = 10` | Caps agent autonomy | Prevents runaway tool loops that would burn tokens and time without converging |
| Skill-scoped tool activation | Model can't use tools outside its current skill | Reduces hallucinated tool calls and keeps each step focused |

## Evaluation

Zod validates the review schema at generation time. If the model produces output that doesn't match — wrong severity values, missing required fields, too few follow-up suggestions — the call fails rather than passing malformed data to the UI.

A schema test (`src/lib/schemas/review.test.ts`) validates that a representative review object parses correctly. Regression check against schema drift.

Each finding is tagged with one of six rubrics (security, bug risk, performance, pattern consistency, maintainability, documentation), so you can measure coverage across categories and spot if the model keeps missing a dimension.

Where I'd take this next: a fixture set of known PRs with expected findings. A PR with a known SQL injection should always produce a security/critical finding. Track whether the model's output regresses across prompt or model changes.

## Running Locally

### Prerequisites

- Node.js 18+ or Bun
- A GitHub personal access token
- An Anthropic API key

### Setup

```bash
git clone <repo-url>
cd pr-lens
bun install
```

Copy the environment template and fill in your keys:

```bash
cp .env.example .env.local
```

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
```

Your GitHub token needs read access to the repositories you want to review. The Anthropic key is for Claude API calls.

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a GitHub PR URL, and the agent will gather context and generate a structured review.

### Scripts

```bash
bun run dev       # Start development server
bun run build     # Production build
bun run lint      # Run ESLint
bun test --run    # Run tests
```
