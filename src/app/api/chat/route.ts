import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

import {
  buildBaseSystemPrompt,
  buildStepSystemPrompt,
  buildTools,
  MAX_TOOL_STEPS,
  pruneOrchestrationMessages,
  selectStepState,
} from "@/lib/agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const tools = buildTools();

  const result = streamText({
    activeTools: ["load_skill", "search_tools"] satisfies Array<keyof typeof tools>,
    model: anthropic("claude-sonnet-4-20250514"),
    messages: await convertToModelMessages(messages),
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
    onError: (error) => (error instanceof Error ? error.message : "Unknown server error."),
    originalMessages: messages,
  });
}
