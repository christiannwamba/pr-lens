# PR Lens — Implementation Plan

## Overview

PR Lens is an AI-powered pull request review tool. Users paste a GitHub PR URL and receive a structured, multi-rubric code review streamed in real time. After the review, users continue chatting with the agent to ask follow-ups, request explanations, or dig deeper into specific findings.

**Tech stack:** Next.js (App Router), AI SDK v6, AI Elements (shadcn-based), Anthropic Claude, Zod, Bun, Tailwind CSS v4, Vitest.

---

## Architecture

### Two-Layer Agent with Skill Routing

The orchestrator uses a **skill system** (adapted from [lean-agent/src/agent.ts](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts)) to load focused prompts and tool subsets based on what the user needs. This keeps each interaction sharp — the agent reads instructions for one job at a time, not six.

```
User message arrives
       │
       ▼
Orchestrator (streamText) — base prompt + meta-tools only
       │
       ├─ Step 1: load_skill("review-pr") ← agent picks skill
       ├─ Step 2: prepareStep swaps in skill prompt + activates skill tools
       ├─ Step 3-7: agent calls context tools (fetchPRDiff, fetchBlame, etc.)
       ├─ Step 8: agent calls generateStructuredReview
       ├─ Step 9: review sub-agent runs (generateText + Output.object)
       └─ Step 10: orchestrator wraps up with summary text
```

### Skills

| Skill | Description | Tools Activated | When Used |
|---|---|---|---|
| `review-pr` | Full structured PR review | All context tools + `generate_structured_review` | User pastes a PR URL |
| `explain-finding` | Deep-dive into a specific finding | `fetch_file_content`, `fetch_blame` | "Explain the security finding" |
| `suggest-fix` | Concrete fix with before/after code | `fetch_file_content` | "How do I fix this?" |
| `explore-history` | Blame and commit analysis | `fetch_blame`, `fetch_related_issues` | "What's the history of this file?" |
| `compare-patterns` | Compare with codebase conventions | `fetch_file_content`, `fetch_repo_guidelines` | "Does the rest of the codebase do it this way?" |

### Skill-Tool Map

```typescript
// Mirrors the pattern from lean-agent/src/agent.ts:177-189
const SKILL_TOOL_MAP: Record<string, FunctionalToolName[]> = {
  'review-pr': [
    'fetch_pr_diff', 'fetch_repo_guidelines', 'fetch_file_content',
    'fetch_blame', 'fetch_related_issues', 'generate_structured_review',
  ],
  'explain-finding': ['fetch_file_content', 'fetch_blame'],
  'suggest-fix': ['fetch_file_content'],
  'explore-history': ['fetch_blame', 'fetch_related_issues'],
  'compare-patterns': ['fetch_file_content', 'fetch_repo_guidelines'],
};
```

---

## Project Structure

```
pr-lens/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Main page — renders ChatInterface
│   ├── api/
│   │   └── chat/
│   │       └── route.ts                  # Chat API route (orchestrator)
│   └── components/
│       ├── chat-interface.tsx             # useChat + Conversation + PromptInput
│       ├── review-card.tsx               # Rich review rendering
│       ├── finding-item.tsx              # Individual finding with severity badge
│       └── tool-progress.tsx             # Tool call status pills
├── lib/
│   ├── agent.ts                          # buildTools, prepareStep, skill routing
│   ├── skills/
│   │   ├── index.ts                      # Skill registry + loader
│   │   ├── review-pr.md                  # Full PR review skill
│   │   ├── explain-finding.md            # Explain a finding
│   │   ├── suggest-fix.md               # Suggest concrete fixes
│   │   ├── explore-history.md            # Blame/history analysis
│   │   └── compare-patterns.md           # Codebase pattern comparison
│   ├── tools/
│   │   ├── index.ts                      # Tool registry
│   │   ├── fetch-pr-diff.ts
│   │   ├── fetch-file-content.ts
│   │   ├── fetch-blame.ts
│   │   ├── fetch-repo-guidelines.ts
│   │   ├── fetch-related-issues.ts
│   │   └── generate-structured-review.ts # Sub-agent tool
│   ├── prompts/
│   │   ├── orchestrator.ts               # Base + step system prompts
│   │   └── review-subagent.ts            # Review sub-agent system prompt
│   ├── schemas/
│   │   └── review.ts                     # Zod ReviewSchema + FindingSchema
│   ├── github.ts                         # GitHub API client
│   └── utils.ts                          # PR URL parser
├── components/
│   ├── ai-elements/                      # Installed by AI Elements CLI (owned code)
│   │   ├── conversation.tsx
│   │   ├── message.tsx
│   │   ├── prompt-input.tsx
│   │   └── loader.tsx
│   └── ui/                               # shadcn/ui primitives
├── __tests__/
│   └── evals/
│       ├── fixtures/
│       │   ├── sql-injection.ts
│       │   ├── missing-error-handling.ts
│       │   ├── pattern-violation.ts
│       │   ├── good-pr.ts
│       │   ├── performance-issue.ts
│       │   └── missing-types.ts
│       ├── helpers.ts                    # runReviewEval, judgeReview
│       └── review.eval.test.ts           # Main eval suite
├── .env.local
├── .env.example
├── next.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Step 1 — Scaffold & Boot

### What
Create the Next.js project with Bun, install all dependencies, set up AI Elements.

### Commands
```bash
bun create next-app pr-lens --app --tailwind --typescript --eslint --src-dir=false --import-alias="@/*"
cd pr-lens

# AI SDK v6 + Anthropic provider
bun add ai @ai-sdk/react @ai-sdk/anthropic zod

# AI Elements (installs shadcn + elements into components/)
bunx shadcn@latest init
bunx shadcn@latest add "https://elements.ai-sdk.dev/r/conversation.json"
bunx shadcn@latest add "https://elements.ai-sdk.dev/r/message.json"
bunx shadcn@latest add "https://elements.ai-sdk.dev/r/prompt-input.json"
bunx shadcn@latest add "https://elements.ai-sdk.dev/r/loader.json"

# Markdown rendering for chat messages
bun add react-markdown remark-gfm

# Dev deps
bun add -d vitest
```

### Environment
```env
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...         # Optional, for private repos + higher rate limits
```

### Verify
```bash
bun dev
# → Browser shows default Next.js page at localhost:3000
# → No build errors
# → components/ai-elements/ directory exists with conversation.tsx, message.tsx, etc.
```

---

## Step 2 — Landing Page (Static UI)

### What
Build the landing page with a centered PromptInput. Dark theme. No functionality yet.

### Code: `app/page.tsx`
```tsx
import { ChatInterface } from './components/chat-interface';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100">
      <ChatInterface />
    </main>
  );
}
```

### Code: `app/components/chat-interface.tsx`
```tsx
'use client';

import { useState } from 'react';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';

export function ChatInterface() {
  const [text, setText] = useState('');

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">PR Lens</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Paste a GitHub PR URL to start a review
        </p>
      </div>
      <PromptInput onSubmit={() => {}} className="w-full">
        <PromptInputTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
        />
        <PromptInputSubmit />
      </PromptInput>
    </div>
  );
}
```

### Verify
```
bun dev
# → Browser shows centered "PR Lens" heading + input field
# → Dark theme, clean layout
# → Input accepts text, submit button visible
```

---

## Step 3 — Chat Route (Echo Bot)

### What
Wire up the chat API route with `streamText` and connect it to the frontend with `useChat`. No tools yet — just verify the full streaming loop works.

### Code: `app/api/chat/route.ts`

Reference: This follows the same `generateText` + tools pattern from
[lean-agent/src/agent.ts:817-871](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts#L817),
but adapted for Next.js route handlers with `streamText` + `toUIMessageStreamResponse()`.

```typescript
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: 'You are PR Lens, an AI code review assistant. For now, just respond conversationally.',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

### Code: `app/components/chat-interface.tsx` (updated)

Reference: Uses AI Elements `Conversation`, `Message`, `PromptInput` components
as shown in the [AI Elements chatbot example](https://elements.ai-sdk.dev).

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';

export function ChatInterface() {
  const [text, setText] = useState('');
  const { messages, sendMessage, status } = useChat();
  const hasMessages = messages.length > 0;

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    sendMessage({ text: message.text });
    setText('');
  };

  return (
    <div className="flex h-screen w-full max-w-3xl flex-col mx-auto p-6">
      {!hasMessages ? (
        // Landing state — centered input
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">PR Lens</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Paste a GitHub PR URL to start a review
            </p>
          </div>
          <PromptInput onSubmit={handleSubmit} className="w-full">
            <PromptInputTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
            />
            <PromptInputSubmit />
          </PromptInput>
        </div>
      ) : (
        // Chat state — messages + pinned input
        <>
          <Conversation className="flex-1">
            <ConversationContent>
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      if (part.type === 'text') {
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))}
              {status === 'submitted' && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <PromptInput onSubmit={handleSubmit} className="mt-4">
            <PromptInputTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask a follow-up question..."
            />
            <PromptInputSubmit />
          </PromptInput>
        </>
      )}
    </div>
  );
}
```

### Verify
```
bun dev
# → Type "hello" in the input → message appears → streamed AI response renders
# → Layout transitions from centered landing to chat layout on first message
# → Loader shows during streaming
# → Follow-up messages work
```

---

## Step 4 — PR URL Parser + GitHub Client

### What
Build the foundational utilities: parse PR URLs and make authenticated GitHub API calls.

### Code: `lib/utils.ts`
```typescript
export function parsePRUrl(url: string): {
  owner: string;
  repo: string;
  prNumber: number;
} | null {
  // Matches: https://github.com/{owner}/{repo}/pull/{number}
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10),
  };
}
```

### Code: `lib/github.ts`
```typescript
const GITHUB_API = 'https://api.github.com';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

export async function githubFetch(
  path: string,
  options?: { accept?: string }
): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: options?.accept ?? 'application/vnd.github.v3+json',
    'User-Agent': 'pr-lens',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API}${path}`, { headers });

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining === '0') {
      throw new Error('GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.');
    }
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} for ${path}`);
  }

  return response;
}

export async function githubGraphQL(query: string, variables: Record<string, unknown>) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN required for GraphQL API (blame data)');
  }

  const response = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL error: ${response.status}`);
  }

  return response.json();
}
```

### Verify
```typescript
// Quick test in a scratch file or via bun repl:
import { parsePRUrl } from './lib/utils';

console.log(parsePRUrl('https://github.com/vercel/next.js/pull/12345'));
// → { owner: 'vercel', repo: 'next.js', prNumber: 12345 }

console.log(parsePRUrl('not a url'));
// → null
```

---

## Step 5 — Context Tools (All 5)

### What
Implement all 5 GitHub context-gathering tools. Each follows the AI SDK `tool()` pattern
from [lean-agent/src/agent.ts:646-792](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts#L646).

### Code: `lib/tools/fetch-pr-diff.ts`
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { githubFetch } from '../github';

export const fetchPRDiff = tool({
  description: 'Fetch PR metadata and changed files with patches from GitHub.',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    prNumber: z.number(),
  }),
  execute: async ({ owner, repo, prNumber }) => {
    // Fetch PR metadata
    const prResponse = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`);
    const pr = await prResponse.json();

    // Fetch changed files
    const filesResponse = await githubFetch(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`
    );
    const files = await filesResponse.json();

    // Truncate large patches to avoid blowing up context
    const MAX_PATCH_LINES = 500;
    const truncatedFiles = files.map((file: any) => {
      const patch = file.patch ?? '';
      const lines = patch.split('\n');
      const truncated = lines.length > MAX_PATCH_LINES;
      return {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: truncated
          ? lines.slice(0, MAX_PATCH_LINES).join('\n') + '\n... [truncated]'
          : patch,
        truncated,
      };
    });

    return {
      title: pr.title,
      body: pr.body?.slice(0, 2000) ?? '',
      author: pr.user.login,
      baseRef: pr.base.ref,
      headRef: pr.head.ref,
      headSha: pr.head.sha,
      changedFileCount: pr.changed_files,
      additions: pr.additions,
      deletions: pr.deletions,
      files: truncatedFiles,
    };
  },
});
```

### Code: `lib/tools/fetch-file-content.ts`
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { githubFetch } from '../github';

export const fetchFileContent = tool({
  description: 'Fetch the full content of a file at a specific git ref.',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    path: z.string(),
    ref: z.string(),
  }),
  execute: async ({ owner, repo, path, ref }) => {
    const response = await githubFetch(
      `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
    );
    const data = await response.json();

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const lines = content.split('\n');
    const MAX_LINES = 500;

    return {
      path,
      ref,
      content: lines.length > MAX_LINES
        ? lines.slice(0, MAX_LINES).join('\n') + `\n... [truncated at ${MAX_LINES} lines]`
        : content,
      totalLines: lines.length,
      truncated: lines.length > MAX_LINES,
    };
  },
});
```

### Code: `lib/tools/fetch-blame.ts`
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { githubGraphQL, githubFetch } from '../github';

export const fetchBlame = tool({
  description: 'Fetch git blame for a file to understand who changed what and when.',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    path: z.string(),
    branch: z.string(),
  }),
  execute: async ({ owner, repo, path, branch }) => {
    try {
      // Try GraphQL blame first
      const result = await githubGraphQL(
        `query($owner: String!, $repo: String!, $expression: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $expression) {
              ... on Blob {
                blame {
                  ranges {
                    startingLine
                    endingLine
                    commit {
                      message
                      authoredDate
                      author { name }
                    }
                  }
                }
              }
            }
          }
        }`,
        { owner, repo, expression: `${branch}:${path}` }
      );

      const ranges = result.data?.repository?.object?.blame?.ranges ?? [];
      return {
        path,
        branch,
        source: 'graphql' as const,
        ranges: ranges.slice(0, 30).map((range: any) => ({
          startLine: range.startingLine,
          endLine: range.endingLine,
          author: range.commit.author.name,
          date: range.commit.authoredDate,
          message: range.commit.message.split('\n')[0],
        })),
      };
    } catch {
      // Fallback to REST: recent commits for the file
      const response = await githubFetch(
        `/repos/${owner}/${repo}/commits?path=${path}&per_page=10`
      );
      const commits = await response.json();

      return {
        path,
        branch,
        source: 'rest-fallback' as const,
        recentCommits: commits.map((commit: any) => ({
          sha: commit.sha.slice(0, 7),
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          message: commit.commit.message.split('\n')[0],
        })),
      };
    }
  },
});
```

### Code: `lib/tools/fetch-repo-guidelines.ts`
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { githubFetch } from '../github';

const GUIDELINE_FILES = [
  'README.md',
  'CONTRIBUTING.md',
  '.github/CONTRIBUTING.md',
  'eslint.config.js',
  'eslint.config.mjs',
  '.eslintrc.json',
  '.prettierrc',
  '.prettierrc.json',
  'tsconfig.json',
  '.github/pull_request_template.md',
];

export const fetchRepoGuidelines = tool({
  description: 'Fetch repo convention files (CONTRIBUTING, eslint, tsconfig, etc.) to understand project standards.',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    ref: z.string(),
  }),
  execute: async ({ owner, repo, ref }) => {
    const results: Record<string, string> = {};

    // Fetch all in parallel, ignore 404s
    const settled = await Promise.allSettled(
      GUIDELINE_FILES.map(async (file) => {
        const response = await githubFetch(
          `/repos/${owner}/${repo}/contents/${file}?ref=${ref}`
        );
        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        // Truncate large files
        return {
          file,
          content: content.slice(0, 3000),
        };
      })
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results[result.value.file] = result.value.content;
      }
    }

    return {
      filesFound: Object.keys(results),
      guidelines: results,
    };
  },
});
```

### Code: `lib/tools/fetch-related-issues.ts`
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { githubFetch } from '../github';

export const fetchRelatedIssues = tool({
  description: 'Search repo issues related to the PR changes.',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    searchTerms: z.array(z.string()).describe('Keywords to search for in issues'),
  }),
  execute: async ({ owner, repo, searchTerms }) => {
    const query = searchTerms.join('+') + `+repo:${owner}/${repo}+type:issue`;
    const response = await githubFetch(
      `/search/issues?q=${encodeURIComponent(query)}&per_page=5`
    );
    const data = await response.json();

    return {
      issues: (data.items ?? []).map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        body: issue.body?.slice(0, 200) ?? '',
      })),
    };
  },
});
```

### Code: `lib/tools/index.ts`
```typescript
export { fetchPRDiff } from './fetch-pr-diff';
export { fetchFileContent } from './fetch-file-content';
export { fetchBlame } from './fetch-blame';
export { fetchRepoGuidelines } from './fetch-repo-guidelines';
export { fetchRelatedIssues } from './fetch-related-issues';
export { generateStructuredReview } from './generate-structured-review';
```

### Verify
```
bun dev
# Update route.ts to register fetchPRDiff as a tool (temporarily)
# Paste a real public PR URL → agent calls fetchPRDiff → tool result visible in chat
# Check browser network tab — streaming response with tool call events
```

---

## Step 6 — Zod Review Schema

### What
Define the structured output schema for reviews.

### Code: `lib/schemas/review.ts`
```typescript
import { z } from 'zod';

export const FindingSchema = z.object({
  rubric: z.enum([
    'pattern-consistency',
    'security',
    'bug-risk',
    'performance',
    'maintainability',
    'documentation',
  ]),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  title: z.string().describe('Short, specific title for the finding'),
  description: z.string().describe('Detailed explanation of the issue and why it matters'),
  file: z.string().describe('File path where the issue was found'),
  lineRange: z.string().optional().describe("Line range, e.g. 'L42-L58'"),
  suggestion: z.string().optional().describe('Concrete code suggestion or fix approach'),
});

export const ReviewSchema = z.object({
  summary: z.string().describe('2-3 sentence overview of the PR and the review findings'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  findings: z.array(FindingSchema).describe('Specific findings, ordered by severity'),
  praise: z.array(z.string()).describe('Things the PR does well'),
  verdict: z.enum(['approve', 'request-changes', 'needs-discussion']),
});

export type Review = z.infer<typeof ReviewSchema>;
export type Finding = z.infer<typeof FindingSchema>;
```

### Verify
```typescript
// Quick validation test:
import { ReviewSchema } from './lib/schemas/review';

const mockReview = {
  summary: 'This PR adds user authentication.',
  riskLevel: 'medium',
  findings: [{
    rubric: 'security',
    severity: 'critical',
    title: 'SQL injection in login query',
    description: 'User input is concatenated directly into SQL.',
    file: 'src/auth.ts',
    lineRange: 'L42-L58',
    suggestion: 'Use parameterized queries.',
  }],
  praise: ['Good test coverage'],
  verdict: 'request-changes',
};

ReviewSchema.parse(mockReview); // Should not throw
```

---

## Step 7 — Skill System

### What
Build the skill registry as TypeScript objects. Each skill has a name, description, instructions (the prompt), and a list of tools it activates.

Reference: Adapted from [lean-agent/src/skills.ts](file:///Users/christiannwamba/dev/lean-agent/src/skills.ts)
and [lean-agent/skills/task-create/SKILL.md](file:///Users/christiannwamba/dev/lean-agent/skills/task-create/SKILL.md).
Instead of file-based discovery, we use a typed registry since PR Lens has a fixed set of skills.

### Code: `lib/skills/index.ts`
```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

export type Skill = {
  name: string;
  description: string;
  instructions: string;
  tools: string[];
};

const SKILLS_DIR = join(process.cwd(), 'lib', 'skills');

// Skill-to-tool mapping
const SKILL_TOOL_MAP: Record<string, string[]> = {
  'review-pr': [
    'fetch_pr_diff', 'fetch_repo_guidelines', 'fetch_file_content',
    'fetch_blame', 'fetch_related_issues', 'generate_structured_review',
  ],
  'explain-finding': ['fetch_file_content', 'fetch_blame'],
  'suggest-fix': ['fetch_file_content'],
  'explore-history': ['fetch_blame', 'fetch_related_issues'],
  'compare-patterns': ['fetch_file_content', 'fetch_repo_guidelines'],
};

export function loadSkill(name: string): Skill {
  const filePath = join(SKILLS_DIR, `${name}.md`);
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    name: data.name,
    description: data.description,
    instructions: content.trim(),
    tools: SKILL_TOOL_MAP[name] ?? [],
  };
}

export function listSkills(): Array<{ name: string; description: string }> {
  return Object.entries(SKILL_TOOL_MAP).map(([name]) => {
    const skill = loadSkill(name);
    return { name: skill.name, description: skill.description };
  });
}

export function getSkillToolMap() {
  return SKILL_TOOL_MAP;
}
```

### Code: `lib/skills/review-pr.md`
```markdown
---
name: review-pr
description: Perform a full structured PR review with multi-rubric analysis.
---

# PR Review

Use this skill when the user shares a GitHub PR URL for review.

## Goals

- Gather comprehensive context before producing a review.
- Evaluate against all 6 rubrics: pattern-consistency, security, bug-risk, performance, maintainability, documentation.
- Produce a structured review with specific, actionable findings.

## Workflow

1. Call `fetch_pr_diff` to get PR metadata and changed files.
2. Call `fetch_repo_guidelines` to understand the project's conventions.
3. For the 2-4 most important changed files, call `fetch_blame` to understand history.
4. If critical areas are touched, call `fetch_file_content` to see full context around changes.
5. If relevant, call `fetch_related_issues` to find connected issues.
6. Once sufficient context is gathered, call `generate_structured_review` with ALL context.

## Rules

- Never review based on the diff alone — always gather at least guidelines + blame.
- For large PRs (>20 files), focus on the most impactful changes and note the focused scope.
- Truncated diffs should be noted in the review context.
- Acknowledge good code, not just problems.
```

### Code: `lib/skills/explain-finding.md`
```markdown
---
name: explain-finding
description: Deep-dive into a specific review finding with code context and history.
---

# Explain Finding

Use this skill when the user asks about a specific finding from a review.

## Goals

- Explain clearly WHY the finding matters, not just what it is.
- Show the relevant code and its history.
- Provide educational context — help the user learn.

## Workflow

1. Identify which file and line range the finding references.
2. Call `fetch_file_content` to get the full file for context.
3. Call `fetch_blame` to show who introduced the pattern and when.
4. Explain the finding in depth with specific code references.

## Rules

- Be specific — reference exact lines and code.
- If the finding is about a pattern, explain what the correct pattern looks like.
- Don't repeat the entire review — focus on the specific finding asked about.
```

### Code: `lib/skills/suggest-fix.md`
```markdown
---
name: suggest-fix
description: Provide concrete code fixes with before/after examples.
---

# Suggest Fix

Use this skill when the user asks how to fix a finding or improve their code.

## Goals

- Show concrete before/after code.
- Be specific about what to change and where.
- Explain why the fix works.

## Workflow

1. Call `fetch_file_content` to get the current file content.
2. Identify the exact code that needs to change.
3. Write the corrected code with explanation.

## Rules

- Show the minimal change needed — don't rewrite the entire file.
- Use code blocks with the file path as the language tag.
- If multiple approaches exist, recommend the simplest one.
```

### Code: `lib/skills/explore-history.md`
```markdown
---
name: explore-history
description: Analyze git blame and commit history for a file or change.
---

# Explore History

Use this skill when the user asks about the history of a file or change.

## Goals

- Show who changed what, when, and why.
- Connect changes to related issues.
- Build a narrative of how the code evolved.

## Workflow

1. Call `fetch_blame` for the file in question.
2. Call `fetch_related_issues` with relevant terms from the blame data.
3. Summarize the history as a chronological narrative.

## Rules

- Focus on the most relevant changes, not every single commit.
- Connect commits to issues when possible.
- Highlight if the pattern was introduced recently vs. being longstanding.
```

### Code: `lib/skills/compare-patterns.md`
```markdown
---
name: compare-patterns
description: Compare code patterns with the rest of the codebase.
---

# Compare Patterns

Use this skill when the user asks whether the PR follows codebase conventions.

## Goals

- Show how the pattern is used elsewhere in the codebase.
- Identify deviations from established conventions.
- Reference specific guideline files when relevant.

## Workflow

1. Call `fetch_repo_guidelines` to get project conventions.
2. Call `fetch_file_content` for 2-3 files that follow the established pattern.
3. Compare the PR's approach with the established pattern.

## Rules

- Be objective — the PR might have a good reason for deviating.
- Show concrete code examples from the codebase, not abstract rules.
- Reference specific guideline files (eslint, tsconfig, CONTRIBUTING) when they apply.
```

### Verify
```typescript
import { loadSkill, listSkills } from './lib/skills';

const skill = loadSkill('review-pr');
console.log(skill.name);         // → "review-pr"
console.log(skill.tools.length); // → 6
console.log(skill.instructions); // → markdown content without frontmatter

const skills = listSkills();
console.log(skills.length);      // → 5
```

---

## Step 8 — Agent Orchestration (prepareStep + Skill Routing)

### What
Build the core agent logic: meta-tools (`load_skill`, `search_tools`), `prepareStep` for dynamic
tool/prompt switching, and wire it all into the chat route.

Reference: Directly adapted from [lean-agent/src/agent.ts:639-871](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts#L639).
The key patterns are:
- Meta-tools activate functional tools ([lean-agent/src/agent.ts:646-668](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts#L646))
- `selectStepState` reads the latest tool results to determine active skill/tools ([lean-agent/src/agent.ts:394-412](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts#L394))
- `prepareStep` swaps system prompt and activeTools each step ([lean-agent/src/agent.ts:824-844](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts#L824))
- `pruneConsumedOrchestrationMessages` keeps history clean ([lean-agent/src/agent.ts:414-435](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts#L414))

### Code: `lib/agent.ts`
```typescript
import { tool, stepCountIs, pruneMessages, type ToolSet, type StepResult } from 'ai';
import { z } from 'zod';
import { loadSkill, listSkills, getSkillToolMap } from './skills';
import { fetchPRDiff } from './tools/fetch-pr-diff';
import { fetchFileContent } from './tools/fetch-file-content';
import { fetchBlame } from './tools/fetch-blame';
import { fetchRepoGuidelines } from './tools/fetch-repo-guidelines';
import { fetchRelatedIssues } from './tools/fetch-related-issues';
import { generateStructuredReview } from './tools/generate-structured-review';

// --- Tool name constants ---

const META_TOOL_NAMES = ['load_skill', 'search_tools'] as const;

const FUNCTIONAL_TOOL_NAMES = [
  'fetch_pr_diff',
  'fetch_file_content',
  'fetch_blame',
  'fetch_repo_guidelines',
  'fetch_related_issues',
  'generate_structured_review',
] as const;

type MetaToolName = (typeof META_TOOL_NAMES)[number];
type FunctionalToolName = (typeof FUNCTIONAL_TOOL_NAMES)[number];

// --- Schemas for parsing meta-tool results ---

const loadSkillResultSchema = z.object({ name: z.string() });
const searchToolsResultSchema = z.object({
  tools: z.array(z.enum(FUNCTIONAL_TOOL_NAMES)),
});

// --- Step state selection (from lean-agent pattern) ---

function getLatestToolResult<Output>(
  steps: StepResult<ToolSet>[],
  toolName: string,
  parser: z.ZodType<Output>,
): { stepNumber: number; output: Output } | undefined {
  for (const step of [...steps].reverse()) {
    for (const toolResult of [...step.toolResults].reverse()) {
      if (toolResult.toolName !== toolName) continue;
      const parsed = parser.safeParse(toolResult.output);
      if (!parsed.success) continue;
      return { stepNumber: step.stepNumber, output: parsed.data };
    }
  }
  return undefined;
}

function selectStepState(steps: StepResult<ToolSet>[]) {
  const latestSkill = getLatestToolResult(steps, 'load_skill', loadSkillResultSchema);
  const latestSearch = getLatestToolResult(steps, 'search_tools', searchToolsResultSchema);

  const shouldUseSearchResult =
    latestSearch != null &&
    (latestSkill == null || latestSearch.stepNumber >= latestSkill.stepNumber);

  const functionalTools = shouldUseSearchResult ? latestSearch.output.tools : [];

  return {
    activeSkillName: latestSkill?.output.name,
    activeTools: [...META_TOOL_NAMES, ...functionalTools],
  };
}

// --- System prompts ---

function buildBaseSystemPrompt(): string {
  const skills = listSkills();
  const skillList = skills
    .map((s) => `- **${s.name}**: ${s.description}`)
    .join('\n');

  return `You are PR Lens, an expert AI code review assistant.

For tool-using work, call \`load_skill\` first, then \`search_tools\`.
\`search_tools\` activates the tools you need for the next step.
You may call both again later to change direction.

## Available Skills
${skillList}

## Behavior
- When the user pastes a PR URL, load the "review-pr" skill.
- When the user asks about a specific finding, load "explain-finding".
- When the user asks how to fix something, load "suggest-fix".
- When the user asks about file history, load "explore-history".
- When the user asks about codebase patterns, load "compare-patterns".
- For general questions about the PR, respond conversationally using context from the review.
- Be direct and specific. Cite file paths and line numbers.
- Acknowledge good code, not just problems.`;
}

function buildStepSystemPrompt(activeSkillName?: string): string {
  if (!activeSkillName) return buildBaseSystemPrompt();

  const skill = loadSkill(activeSkillName);
  return [
    buildBaseSystemPrompt(),
    '## Active Skill',
    `Current skill: ${skill.name}`,
    skill.instructions,
  ].join('\n\n');
}

// --- Tool search (for search_tools meta-tool) ---

function searchToolCatalog(input: { skillName?: string; query?: string }) {
  const skillToolMap = getSkillToolMap();
  if (input.skillName && skillToolMap[input.skillName]) {
    return { tools: skillToolMap[input.skillName] };
  }
  // Fallback: return all tools if no skill match
  return { tools: [...FUNCTIONAL_TOOL_NAMES] };
}

// --- Build tools ---

export function buildTools() {
  return {
    load_skill: tool({
      description: 'Load a skill by name to get focused instructions for the current task.',
      inputSchema: z.object({
        name: z.string().describe('Skill name to load'),
      }),
      execute: ({ name }) => {
        const skill = loadSkill(name);
        return { name: skill.name };
      },
    }),
    search_tools: tool({
      description: 'Search and activate the tools needed for the current skill.',
      inputSchema: z.object({
        skillName: z.string().optional(),
        query: z.string().optional(),
      }),
      execute: (input) => searchToolCatalog(input),
    }),
    fetch_pr_diff: fetchPRDiff,
    fetch_file_content: fetchFileContent,
    fetch_blame: fetchBlame,
    fetch_repo_guidelines: fetchRepoGuidelines,
    fetch_related_issues: fetchRelatedIssues,
    generate_structured_review: generateStructuredReview,
  } as const;
}

// --- Orchestration message pruning ---

function pruneOrchestrationMessages(messages: any[]) {
  return pruneMessages({
    messages,
    reasoning: 'none',
    toolCalls: [
      {
        type: 'before-last-message',
        tools: [...META_TOOL_NAMES],
      },
    ],
    emptyMessages: 'remove',
  });
}

// --- Export for route ---

export const MAX_TOOL_STEPS = 10;

export { selectStepState, buildBaseSystemPrompt, buildStepSystemPrompt, pruneOrchestrationMessages };
```

### Code: `app/api/chat/route.ts` (updated)
```typescript
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  buildTools,
  buildBaseSystemPrompt,
  selectStepState,
  buildStepSystemPrompt,
  pruneOrchestrationMessages,
  MAX_TOOL_STEPS,
} from '@/lib/agent';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const tools = buildTools();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: buildBaseSystemPrompt(),
    messages: await convertToModelMessages(messages),
    tools,
    // Start with only meta-tools active — agent must load a skill first
    activeTools: ['load_skill', 'search_tools'] as Array<keyof typeof tools>,
    stopWhen: stepCountIs(MAX_TOOL_STEPS),

    // Dynamic tool/prompt switching per step (lean-agent pattern)
    prepareStep: ({ steps, messages }) => {
      const stepState = selectStepState(steps);
      return {
        activeTools: stepState.activeTools as Array<keyof typeof tools>,
        system: buildStepSystemPrompt(stepState.activeSkillName),
        messages: pruneOrchestrationMessages(messages),
      };
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Verify
```
bun dev
# Paste a real PR URL (e.g. https://github.com/vercel/ai/pull/1234)
# Watch the stream — you should see:
#   1. load_skill("review-pr") tool call
#   2. search_tools({ skillName: "review-pr" }) tool call
#   3. fetch_pr_diff tool call with PR data
#   4. fetch_repo_guidelines tool call
#   5. fetch_blame tool calls
#   6. Agent streams response text
# The tool calls appear as parts in the message stream
```

---

## Step 9 — Review Sub-Agent Tool

### What
Build the `generate_structured_review` tool that runs a sub-agent with `generateText` + `Output.object()`
to produce a Zod-validated structured review.

Reference: Uses the `Output.object()` pattern from
[lean-agent/evals/helpers.ts:133-147](file:///Users/christiannwamba/dev/lean-agent/evals/helpers.ts#L133)
and the subagent pattern from
[lean-agent/src/subagents/task-context.ts:49-67](file:///Users/christiannwamba/dev/lean-agent/src/subagents/task-context.ts#L49).

### Code: `lib/prompts/review-subagent.ts`
```typescript
export const reviewSubagentPrompt = `You are a senior code reviewer producing a structured review.
You will receive the full context of a pull request including diffs, file contents, blame history, repo guidelines, and related issues.

## Review Rubrics

Evaluate against each rubric:

### Pattern Consistency
- Code follows patterns established elsewhere in the codebase
- Naming conventions are consistent
- Error handling matches the project's approach
- Imports and module structure are consistent

### Security
- SQL injection, XSS, CSRF vulnerabilities
- Exposed secrets or credentials
- Missing input validation or sanitization
- Improper auth checks

### Bug Risk
- Null/undefined handling gaps
- Race conditions or timing issues
- Off-by-one errors, missing edge cases
- Unhandled promise rejections

### Performance
- N+1 query patterns
- Unnecessary re-renders (React)
- Missing memoization on hot paths
- Large bundle imports

### Maintainability
- Dead code or unused imports
- Unclear naming
- Missing TypeScript types
- Functions doing too many things

### Documentation
- Missing JSDoc for public APIs
- Complex logic without comments
- PR description accuracy vs actual changes

## Output Rules
- Every finding MUST reference a specific file and ideally a line range.
- Order findings by severity (critical first).
- Be specific — "this is bad" is not acceptable.
- Suggestions should be concrete enough to implement.
- Include praise for genuinely good patterns.
- Verdict: approve only if no critical/high issues exist.`;
```

### Code: `lib/tools/generate-structured-review.ts`
```typescript
import { tool, generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { ReviewSchema } from '../schemas/review';
import { reviewSubagentPrompt } from '../prompts/review-subagent';

export const generateStructuredReview = tool({
  description:
    'Generate a structured PR review from gathered context. Call this AFTER gathering sufficient context with other tools.',
  inputSchema: z.object({
    context: z.string().describe(
      'Serialized blob of all gathered context: PR diff, blame, guidelines, issues, file contents.'
    ),
  }),
  execute: async ({ context }) => {
    // Sub-agent call using generateText + Output.object (lean-agent pattern)
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      output: Output.object({ schema: ReviewSchema }),
      system: reviewSubagentPrompt,
      prompt: `Review this pull request based on the following context:\n\n${context}`,
    });

    return result.output;
  },
});
```

### Verify
```
bun dev
# Paste a real PR URL → full flow runs:
#   1. load_skill → search_tools → context tools fire
#   2. generate_structured_review fires → sub-agent produces Review object
#   3. Tool result contains structured review JSON in the stream
# Check browser devtools network tab for the streamed tool result
```

---

## Step 10 — Tool Progress UI + Review Card

### What
Render tool calls as progress pills and the structured review as a rich card.

### Code: `app/components/tool-progress.tsx`
```tsx
type ToolProgressProps = {
  toolName: string;
  state: string;
};

const TOOL_LABELS: Record<string, string> = {
  load_skill: 'Loading skill',
  search_tools: 'Activating tools',
  fetch_pr_diff: 'Fetching PR diff',
  fetch_file_content: 'Reading file content',
  fetch_blame: 'Analyzing git history',
  fetch_repo_guidelines: 'Checking repo guidelines',
  fetch_related_issues: 'Searching related issues',
  generate_structured_review: 'Generating review',
};

export function ToolProgress({ toolName, state }: ToolProgressProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;
  const isDone = state === 'output-available';
  const isError = state === 'output-error';

  return (
    <div className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
      {isDone ? (
        <span className="text-emerald-400">✓</span>
      ) : isError ? (
        <span className="text-red-400">✗</span>
      ) : (
        <span className="animate-pulse text-zinc-500">●</span>
      )}
      <span>{label}{isDone ? '' : '...'}</span>
    </div>
  );
}
```

### Code: `app/components/review-card.tsx`
```tsx
import type { Review } from '@/lib/schemas/review';
import { FindingItem } from './finding-item';

const RISK_COLORS = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const VERDICT_LABELS = {
  'approve': { label: 'Approve', color: 'text-emerald-400' },
  'request-changes': { label: 'Request Changes', color: 'text-orange-400' },
  'needs-discussion': { label: 'Needs Discussion', color: 'text-yellow-400' },
};

export function ReviewCard({ review }: { review: Review }) {
  const verdict = VERDICT_LABELS[review.verdict];

  return (
    <div className="my-4 rounded-lg border border-zinc-700 bg-zinc-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">PR Review</h2>
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${RISK_COLORS[review.riskLevel]}`}>
            {review.riskLevel.toUpperCase()} RISK
          </span>
          <span className={`text-sm font-medium ${verdict.color}`}>
            {verdict.label}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-zinc-300">{review.summary}</p>

      {/* Findings */}
      {review.findings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">
            Findings ({review.findings.length})
          </h3>
          {review.findings.map((finding, i) => (
            <FindingItem key={i} finding={finding} />
          ))}
        </div>
      )}

      {/* Praise */}
      {review.praise.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">What's done well</h3>
          <ul className="space-y-1">
            {review.praise.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-emerald-400 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Code: `app/components/finding-item.tsx`
```tsx
'use client';

import { useState } from 'react';
import type { Finding } from '@/lib/schemas/review';

const SEVERITY_STYLES = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  suggestion: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const RUBRIC_LABELS: Record<string, string> = {
  'pattern-consistency': 'Pattern',
  'security': 'Security',
  'bug-risk': 'Bug Risk',
  'performance': 'Performance',
  'maintainability': 'Maintainability',
  'documentation': 'Docs',
};

export function FindingItem({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
      {/* Header row: severity + rubric + title */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[finding.severity]}`}>
          {finding.severity}
        </span>
        <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
          {RUBRIC_LABELS[finding.rubric] ?? finding.rubric}
        </span>
        <span className="text-sm font-medium text-zinc-200">{finding.title}</span>
      </div>

      {/* File + line range */}
      <div className="font-mono text-xs text-zinc-500">
        {finding.file}
        {finding.lineRange && `:${finding.lineRange}`}
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-300">{finding.description}</p>

      {/* Collapsible suggestion */}
      {finding.suggestion && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? 'Hide suggestion' : 'Show suggestion'}
          </button>
          {expanded && (
            <pre className="mt-2 rounded bg-zinc-900 p-3 text-xs text-zinc-300 overflow-x-auto">
              {finding.suggestion}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
```

### Code: `app/components/chat-interface.tsx` (updated message rendering)

Add tool part rendering to the message loop:

```tsx
// Inside the message.parts.map:
{message.parts.map((part, i) => {
  switch (part.type) {
    case 'text':
      return (
        <MessageResponse key={`${message.id}-${i}`}>
          {part.text}
        </MessageResponse>
      );

    // Tool parts use the pattern: tool-{toolName}
    // For most tools, show progress pills
    // For generate_structured_review, render the ReviewCard

    default: {
      // Check if it's a tool part (starts with "tool-")
      if (part.type.startsWith('tool-')) {
        const toolName = part.type.replace('tool-', '');

        // Structured review → render ReviewCard
        if (toolName === 'generate_structured_review' && part.state === 'output-available') {
          return <ReviewCard key={`${message.id}-${i}`} review={part.output} />;
        }

        // All other tools → progress pill
        // Hide meta-tools (load_skill, search_tools) from the user
        if (toolName === 'load_skill' || toolName === 'search_tools') {
          return null;
        }

        return (
          <ToolProgress
            key={`${message.id}-${i}`}
            toolName={toolName}
            state={part.state}
          />
        );
      }
      return null;
    }
  }
})}
```

### Verify
```
bun dev
# Paste a real PR URL → full flow:
#   1. Progress pills appear: "Fetching PR diff...", "Checking repo guidelines..."
#   2. Pills update to ✓ as each tool completes
#   3. "Generating review..." pill appears
#   4. Review card renders with summary, risk badge, findings, praise
#   5. Findings are clickable with expandable suggestions
```

---

## Step 11 — Follow-up Chat

### What
Verify the orchestrator handles follow-up questions after a review. The skill system should
route follow-ups to the right skill (explain-finding, suggest-fix, etc.).

### What to Test
After a review is rendered:

1. Ask **"Can you explain the security finding more?"**
   → Agent loads `explain-finding` skill, calls `fetch_file_content` + `fetch_blame`,
     gives detailed explanation.

2. Ask **"How should I fix the performance issue?"**
   → Agent loads `suggest-fix` skill, calls `fetch_file_content`,
     shows concrete before/after code.

3. Ask **"What's the history of this file?"**
   → Agent loads `explore-history` skill, calls `fetch_blame`,
     gives chronological narrative.

4. Ask a **general question** like "Is this PR safe to merge?"
   → Agent responds conversationally using review context from message history,
     no skill loading needed.

### Verify
```
bun dev
# 1. Paste a PR URL → get review
# 2. Ask "Can you explain the security finding?"
#    → New tool calls fire (explain-finding skill), detailed response streams
# 3. Ask "How should I fix it?"
#    → suggest-fix skill loads, concrete code suggestion appears
# 4. Ask "Is this PR safe to merge?"
#    → Conversational response, no tool calls
```

---

## Step 12 — Polish & Edge Cases

### What
Handle error states, large PRs, invalid inputs, and UI polish.

### Error Handling
Every tool's `execute` should catch errors and return descriptive messages (not throw):

```typescript
execute: async (input) => {
  try {
    // ... tool logic
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
},
```

### Edge Cases to Handle
- **Invalid PR URL**: orchestrator tells user the URL is invalid (no tools needed)
- **Private repo without token**: clear error message about needing GITHUB_TOKEN
- **Rate limit exceeded**: error message with rate limit info
- **Very large PR (>20 files)**: orchestrator notes it's doing a focused review
- **Truncated diffs**: context passed to review sub-agent includes truncation notes

### UI Polish
- Input disabled during streaming (`status === 'streaming'`)
- Responsive layout on mobile
- Scroll to bottom on new messages (Conversation handles this)
- Empty state with example PR URLs

### Verify
```
bun dev
# Test each edge case:
# 1. Type "not a url" → conversational response, no crash
# 2. Paste a private repo URL (without token) → clear error message
# 3. Paste a very large PR → review notes focused scope
```

---

## Step 13 — Eval Suite

### What
Build the evaluation suite with fixtures, an LLM judge, and Vitest tests.

Reference: Directly adapted from [lean-agent/evals/helpers.ts](file:///Users/christiannwamba/dev/lean-agent/evals/helpers.ts)
and [lean-agent/evals/output-quality.eval.ts](file:///Users/christiannwamba/dev/lean-agent/evals/output-quality.eval.ts).

### Code: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

### Code: `__tests__/evals/helpers.ts`

Reference: Uses the `judgeOutput` pattern from
[lean-agent/evals/helpers.ts:128-155](file:///Users/christiannwamba/dev/lean-agent/evals/helpers.ts#L128).

```typescript
import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { ReviewSchema, type Review } from '@/lib/schemas/review';
import { reviewSubagentPrompt } from '@/lib/prompts/review-subagent';

export type EvalFixture = {
  name: string;
  description: string;
  prDiff: string;
  repoGuidelines?: string;
  expectedFindings: {
    mustInclude: Array<{
      rubric: string;
      severityAtLeast?: string;
      titleContains?: string;
    }>;
    mustNotInclude?: Array<{
      rubric: string;
      titleContains: string;
    }>;
  };
};

// Run the review sub-agent against a fixture
export async function runReviewEval(fixture: EvalFixture): Promise<Review> {
  const context = [
    `## PR Diff\n${fixture.prDiff}`,
    fixture.repoGuidelines ? `## Guidelines\n${fixture.repoGuidelines}` : '',
  ].filter(Boolean).join('\n\n');

  const result = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    output: Output.object({ schema: ReviewSchema }),
    system: reviewSubagentPrompt,
    prompt: `Review this pull request:\n\n${context}`,
  });

  return result.output;
}

// LLM-as-judge (lean-agent pattern)
export async function judgeReview(input: {
  fixture: EvalFixture;
  review: Review;
  rubric: string;
}): Promise<{ score: number; reasoning: string }> {
  const response = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    output: Output.object({
      schema: z.object({
        score: z.number().int(),
        reasoning: z.string(),
      }),
    }),
    system: [
      'You are an eval judge for a code review AI.',
      'Score the review output from 1 to 5 against the rubric.',
      'Return strict JSON: {"score": <1-5>, "reasoning": "<short reason>"}',
    ].join(' '),
    prompt: [
      `Fixture: ${input.fixture.name}`,
      `Description: ${input.fixture.description}`,
      `Rubric: ${input.rubric}`,
      `Review output:\n${JSON.stringify(input.review, null, 2)}`,
    ].join('\n'),
  });

  return response.output;
}
```

### Code: `__tests__/evals/fixtures/sql-injection.ts`
```typescript
import type { EvalFixture } from '../helpers';

export const sqlInjectionFixture: EvalFixture = {
  name: 'sql-injection-in-user-query',
  description: 'PR introduces raw SQL with string concatenation from user input',
  prDiff: `
diff --git a/src/api/users.ts b/src/api/users.ts
index abc1234..def5678 100644
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -10,6 +10,15 @@ import { db } from '../db';
+export async function searchUsers(req: Request) {
+  const { query } = req.body;
+  const results = await db.execute(
+    \`SELECT * FROM users WHERE name LIKE '%\${query}%' OR email LIKE '%\${query}%'\`
+  );
+  return results;
+}
`,
  expectedFindings: {
    mustInclude: [
      { rubric: 'security', severityAtLeast: 'critical', titleContains: 'sql' },
    ],
    mustNotInclude: [
      { rubric: 'security', titleContains: 'xss' },
    ],
  },
};
```

### Code: `__tests__/evals/fixtures/good-pr.ts`
```typescript
import type { EvalFixture } from '../helpers';

export const goodPRFixture: EvalFixture = {
  name: 'clean-well-structured-pr',
  description: 'Clean PR with good patterns, types, and error handling',
  prDiff: `
diff --git a/src/services/notification.ts b/src/services/notification.ts
index abc1234..def5678 100644
--- a/src/services/notification.ts
+++ b/src/services/notification.ts
@@ -1,4 +1,30 @@
+import { z } from 'zod';
+import type { NotificationChannel } from '../types';
+import { logger } from '../utils/logger';
+
+const SendNotificationSchema = z.object({
+  userId: z.string().uuid(),
+  channel: z.enum(['email', 'sms', 'push']),
+  message: z.string().min(1).max(500),
+});
+
+export async function sendNotification(
+  input: z.infer<typeof SendNotificationSchema>
+): Promise<{ success: boolean; messageId: string }> {
+  const validated = SendNotificationSchema.parse(input);
+
+  try {
+    const result = await deliverToChannel(validated.channel, {
+      userId: validated.userId,
+      content: validated.message,
+    });
+
+    logger.info('Notification sent', { messageId: result.id, channel: validated.channel });
+    return { success: true, messageId: result.id };
+  } catch (error) {
+    logger.error('Notification failed', { error, userId: validated.userId });
+    throw error;
+  }
+}
`,
  expectedFindings: {
    mustInclude: [],
    mustNotInclude: [
      { rubric: 'security', titleContains: 'injection' },
    ],
  },
};
```

(Create 4-6 more fixtures following the same pattern: `missing-error-handling.ts`,
`pattern-violation.ts`, `performance-issue.ts`, `missing-types.ts`)

### Code: `__tests__/evals/review.eval.test.ts`

Reference: Follows the structure from
[lean-agent/evals/skill-routing.eval.ts](file:///Users/christiannwamba/dev/lean-agent/evals/skill-routing.eval.ts)
and [lean-agent/evals/output-quality.eval.ts](file:///Users/christiannwamba/dev/lean-agent/evals/output-quality.eval.ts).

```typescript
import { describe, it, expect } from 'vitest';
import { runReviewEval, judgeReview } from './helpers';
import { sqlInjectionFixture } from './fixtures/sql-injection';
import { goodPRFixture } from './fixtures/good-pr';

describe('PR Review Agent Evals', () => {
  it('detects SQL injection vulnerability', async () => {
    const review = await runReviewEval(sqlInjectionFixture);

    // Structural assertions
    expect(review.findings.length).toBeGreaterThan(0);
    expect(
      review.findings.some(
        (f) => f.rubric === 'security' && f.severity === 'critical'
      )
    ).toBe(true);

    // LLM judge
    const judgment = await judgeReview({
      fixture: sqlInjectionFixture,
      review,
      rubric: 'Did the review correctly identify SQL injection as a critical security issue without hallucinating other vulnerabilities?',
    });
    expect(judgment.score).toBeGreaterThanOrEqual(3);
  }, 30000);

  it('approves a clean PR with praise', async () => {
    const review = await runReviewEval(goodPRFixture);

    // Should approve or at worst needs-discussion
    expect(['approve', 'needs-discussion']).toContain(review.verdict);
    // Should have praise
    expect(review.praise.length).toBeGreaterThan(0);
    // Should not have critical findings
    expect(
      review.findings.filter((f) => f.severity === 'critical')
    ).toHaveLength(0);

    // LLM judge
    const judgment = await judgeReview({
      fixture: goodPRFixture,
      review,
      rubric: 'Did the review correctly identify this as a clean PR, avoid false positives, and include meaningful praise?',
    });
    expect(judgment.score).toBeGreaterThanOrEqual(3);
  }, 30000);

  // ... more fixture tests follow the same pattern
});
```

### Verify
```bash
bunx vitest run
# → Tests pass
# → SQL injection fixture: finds security critical finding
# → Good PR fixture: approves with praise, no false positives
# → Judge scores >= 3 for all cases
```

---

## Step 14 — README Brief

### What
Write the 1-2 page README covering problem, solution, architecture, trade-offs, and Vercel features.

### Sections
1. **Problem**: Review bottlenecks slow shipping velocity
2. **Solution**: AI-powered first-pass review with structured output
3. **Architecture**: Two-layer agent with skill routing, `prepareStep` for dynamic tool switching
4. **Key Decisions**:
   - Skill system for focused prompts (adapted from lean-agent pattern)
   - `streamText` + `Output.object()` (not `streamObject`)
   - AI Elements for polished UI components
   - `prepareStep` for staged tool activation
5. **Trade-offs**: PAT vs OAuth, fixture count, no persistence
6. **Vercel Features**: Next.js App Router, AI SDK v6, AI Elements, streaming
7. **What's Next**: OAuth, persistence, webhooks, expanded evals

### Verify
```
# Read the README — does it cover the assessment criteria?
# Is it 1-2 pages? Does it explain decisions with "why"?
```

---

## Dependency Summary

```json
{
  "dependencies": {
    "next": "latest",
    "react": "^19",
    "react-dom": "^19",
    "ai": "^6.0",
    "@ai-sdk/react": "latest",
    "@ai-sdk/anthropic": "latest",
    "zod": "latest",
    "react-markdown": "latest",
    "remark-gfm": "latest",
    "gray-matter": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "tailwindcss": "^4",
    "vitest": "latest",
    "eslint": "latest"
  }
}
```

---

## Key Reference Files (lean-agent)

These are the files from the reference project that informed this plan:

| Pattern | Reference File | Lines |
|---|---|---|
| Agent orchestration + prepareStep | [src/agent.ts](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts) | 817-871 |
| Tool definitions (aiTool wrapper) | [src/agent.ts](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts) | 229-241, 646-792 |
| Skill-tool mapping | [src/agent.ts](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts) | 177-189 |
| Step state selection | [src/agent.ts](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts) | 394-412 |
| Message pruning | [src/agent.ts](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts) | 414-435 |
| System prompt building | [src/agent.ts](file:///Users/christiannwamba/dev/lean-agent/src/agent.ts) | 252-290 |
| Skill discovery + loading | [src/skills.ts](file:///Users/christiannwamba/dev/lean-agent/src/skills.ts) | 57-87 |
| Skill markdown format | [skills/task-create/SKILL.md](file:///Users/christiannwamba/dev/lean-agent/skills/task-create/SKILL.md) | 1-54 |
| Subagent pattern | [src/subagents/task-context.ts](file:///Users/christiannwamba/dev/lean-agent/src/subagents/task-context.ts) | 49-67 |
| Eval helpers + judgeOutput | [evals/helpers.ts](file:///Users/christiannwamba/dev/lean-agent/evals/helpers.ts) | 71-155 |
| Eval test structure | [evals/skill-routing.eval.ts](file:///Users/christiannwamba/dev/lean-agent/evals/skill-routing.eval.ts) | 1-41 |
| Output quality evals | [evals/output-quality.eval.ts](file:///Users/christiannwamba/dev/lean-agent/evals/output-quality.eval.ts) | 1-39 |
