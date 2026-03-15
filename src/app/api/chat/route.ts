import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system:
      "You are PR Lens, an AI code review assistant. This scaffold only has conversational chat enabled, so respond concisely, technically, and helpfully while acknowledging that the structured review pipeline is being wired next.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
