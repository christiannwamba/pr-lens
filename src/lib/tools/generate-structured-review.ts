import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, tool } from "ai";
import { z } from "zod";

import { reviewSubagentPrompt } from "@/lib/prompts/review-subagent";
import { ReviewSchema } from "@/lib/schemas/review";

export const generateStructuredReview = tool({
  description:
    "Generate a structured PR review from gathered context. Call this after collecting sufficient GitHub context.",
  inputSchema: z.object({
    context: z
      .string()
      .describe("Serialized PR context, including diff, file contents, blame history, guidelines, and issues."),
  }),
  execute: async ({ context }) => {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      output: Output.object({ schema: ReviewSchema }),
      prompt: `Review this pull request using the context below.\n\n${context}`,
      system: reviewSubagentPrompt,
    });

    return result.output;
  },
});
