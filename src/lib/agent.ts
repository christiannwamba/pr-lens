import { pruneMessages, tool, type StepResult, type ToolSet } from "ai";
import { z } from "zod";

import { fetchBlame, fetchFileContent, fetchPRDiff, fetchRelatedIssues, fetchRepoGuidelines, generateStructuredReview } from "@/lib/tools";
import { getSkillToolMap, listSkills, loadSkill, type SkillName } from "@/lib/skills";

const META_TOOL_NAMES = ["load_skill", "search_tools"] as const;
const FUNCTIONAL_TOOL_NAMES = [
  "fetch_pr_diff",
  "fetch_file_content",
  "fetch_blame",
  "fetch_repo_guidelines",
  "fetch_related_issues",
  "generate_structured_review",
] as const;

type FunctionalToolName = (typeof FUNCTIONAL_TOOL_NAMES)[number];

const loadSkillResultSchema = z.object({
  name: z.enum(Object.keys(getSkillToolMap()) as [SkillName, ...SkillName[]]),
});

const searchToolsResultSchema = z.object({
  tools: z.array(z.enum(FUNCTIONAL_TOOL_NAMES)),
});

function getLatestToolResult<TOOLS extends ToolSet, Output>(
  steps: Array<StepResult<TOOLS>>,
  toolName: string,
  parser: z.ZodType<Output>,
) {
  for (const step of [...steps].reverse()) {
    for (const toolResult of [...step.toolResults].reverse()) {
      if (toolResult.toolName !== toolName) {
        continue;
      }

      const parsed = parser.safeParse(toolResult.output);
      if (!parsed.success) {
        continue;
      }

      return {
        output: parsed.data,
        stepNumber: step.stepNumber,
      };
    }
  }

  return undefined;
}

export function selectStepState<TOOLS extends ToolSet>(steps: Array<StepResult<TOOLS>>) {
  const latestSkill = getLatestToolResult(steps, "load_skill", loadSkillResultSchema);
  const latestSearch = getLatestToolResult(steps, "search_tools", searchToolsResultSchema);
  const shouldUseSearchResult =
    latestSearch != null &&
    (latestSkill == null || latestSearch.stepNumber >= latestSkill.stepNumber);

  const activeTools = shouldUseSearchResult ? latestSearch.output.tools : [];

  return {
    activeSkillName: latestSkill?.output.name,
    activeTools: [...META_TOOL_NAMES, ...activeTools],
  };
}

export function buildBaseSystemPrompt() {
  const skillList = listSkills()
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join("\n");

  return `You are PR Lens, an expert AI code review assistant.

For tool-based work:
- Call load_skill first to choose the correct mode for the task.
- Then call search_tools to activate the relevant tools for that skill.
- You may repeat those meta-tools later if the conversation changes direction.

Available skills:
${skillList}

Behavior:
- When the user pastes a GitHub pull request URL, load the review-pr skill.
- When the user asks about a specific finding, load explain-finding.
- When the user asks how to fix something, load suggest-fix.
- When the user asks about file or commit history, load explore-history.
- When the user asks whether a change follows codebase conventions, load compare-patterns.
- Be direct, specific, and grounded in the repository context.
- Cite file paths and line ranges when the available context supports them.`;
}

export function buildStepSystemPrompt(activeSkillName?: SkillName) {
  if (!activeSkillName) {
    return buildBaseSystemPrompt();
  }

  const skill = loadSkill(activeSkillName);

  return `${buildBaseSystemPrompt()}

## Active Skill
Current skill: ${skill.name}

${skill.instructions}`;
}

function searchToolCatalog(input: { query?: string; skillName?: SkillName }) {
  const skillToolMap = getSkillToolMap();

  if (input.skillName && input.skillName in skillToolMap) {
    return { tools: skillToolMap[input.skillName] as FunctionalToolName[] };
  }

  return { tools: [...FUNCTIONAL_TOOL_NAMES] };
}

export function buildTools() {
  return {
    load_skill: tool({
      description: "Load a skill by name to get focused instructions for the current task.",
      inputSchema: z.object({
        name: z.enum(Object.keys(getSkillToolMap()) as [SkillName, ...SkillName[]]),
      }),
      execute: ({ name }) => {
        const skill = loadSkill(name);

        return { name: skill.name };
      },
    }),
    search_tools: tool({
      description: "Search and activate the tools needed for the current skill.",
      inputSchema: z.object({
        query: z.string().optional(),
        skillName: z.enum(Object.keys(getSkillToolMap()) as [SkillName, ...SkillName[]]).optional(),
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

export function pruneOrchestrationMessages(messages: Parameters<typeof pruneMessages>[0]["messages"]) {
  return pruneMessages({
    emptyMessages: "remove",
    messages,
    reasoning: "none",
    toolCalls: [
      {
        tools: [...META_TOOL_NAMES],
        type: "before-last-message",
      },
    ],
  });
}

export const MAX_TOOL_STEPS = 10;
