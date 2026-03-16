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

/**
 * Determines which tools the model can call on the next step by inspecting
 * prior step results. Only the tools mapped to the active skill are enabled —
 * this keeps the tool schema surface small so the model doesn't waste tokens
 * on irrelevant tool descriptions or hallucinate calls to tools it shouldn't use.
 */
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
- Then call search_tools with that same skillName to activate the relevant tools for that skill.
- You may repeat those meta-tools later if the conversation changes direction.
- If the user is asking a general follow-up that can be answered from the existing review, prior tool outputs, or message history, answer directly without loading a skill.

Available skills:
${skillList}

Behavior:
- When the user pastes a GitHub pull request URL, load the review-pr skill.
- When the user asks about a specific finding, load explain-finding.
- When the user asks how to fix something, load suggest-fix.
- When the user asks about file or commit history, load explore-history.
- When the user asks whether a change follows codebase conventions, load compare-patterns.
- After a review is complete, use the previous review card, tool outputs, and conversation history as follow-up context.
- Questions like "Is this PR safe to merge?" should usually be answered conversationally from the existing review unless the user asks you to investigate further.
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

function searchToolCatalog(skillName: SkillName) {
  const skillToolMap = getSkillToolMap();
  return { tools: skillToolMap[skillName] as FunctionalToolName[] };
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
        skillName: z.enum(Object.keys(getSkillToolMap()) as [SkillName, ...SkillName[]]),
      }),
      execute: ({ skillName }) => searchToolCatalog(skillName),
    }),
    fetch_pr_diff: fetchPRDiff,
    fetch_file_content: fetchFileContent,
    fetch_blame: fetchBlame,
    fetch_repo_guidelines: fetchRepoGuidelines,
    fetch_related_issues: fetchRelatedIssues,
    generate_structured_review: generateStructuredReview,
  } as const;
}

/**
 * Strips meta-tool calls (load_skill, search_tools) from earlier messages before
 * sending to the model. These orchestration calls are only useful at the moment
 * they run — keeping them in history wastes context tokens and can confuse the
 * model into re-calling them unnecessarily.
 */
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
