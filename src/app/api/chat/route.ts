import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import {
  buildBaseSystemPrompt,
  buildStepSystemPrompt,
  buildTools,
  MAX_TOOL_STEPS,
  pruneOrchestrationMessages,
  selectStepState,
} from "@/lib/agent";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const tools = buildTools();

  // Sonnet is used for orchestration (tool routing) and the review sub-agent.
  // Haiku would be cheaper but less reliable at multi-step tool selection;
  // Opus would be more capable but the latency/cost penalty isn't justified
  // for a tool-routing task where Sonnet already achieves high accuracy.
  const result = streamText({
    activeTools: ["load_skill", "search_tools"] satisfies Array<
      keyof typeof tools
    >,
    model: anthropic("claude-sonnet-4-6"),
    messages: await convertToModelMessages(messages),
    // prepareStep runs before each agent step, enabling dynamic tool activation
    // and system prompt injection based on which skill is currently loaded.
    // This is what makes skill-switching mid-conversation possible.
    prepareStep: ({ messages: stepMessages, steps }) => {
      const stepState = selectStepState(steps);

      return {
        activeTools: stepState.activeTools as Array<keyof typeof tools>,
        messages: pruneOrchestrationMessages(stepMessages),
        system: buildStepSystemPrompt(stepState.activeSkillName),
      };
    },
    stopWhen: stepCountIs(MAX_TOOL_STEPS),
    system: buildBaseSystemPrompt(),
    tools,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : "Unknown server error.",
    originalMessages: messages,
  });
}
