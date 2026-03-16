import { z } from "zod";

export const FindingSchema = z.object({
  description: z.string().describe("Detailed explanation of the issue and why it matters."),
  file: z.string().describe("Repository file path where the issue was found."),
  lineRange: z.string().optional().describe("Line range, for example L42-L58."),
  rubric: z.enum([
    "pattern-consistency",
    "security",
    "bug-risk",
    "performance",
    "maintainability",
    "documentation",
  ]),
  severity: z.enum(["critical", "warning", "suggestion"]),
  suggestion: z.string().optional().describe("Concrete fix or mitigation guidance."),
  title: z.string().describe("Short, specific title for the finding."),
});

export const ReviewSchema = z.object({
  findings: z.array(FindingSchema).describe("Specific findings ordered by severity."),
  followUpSuggestions: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      "Short follow-up prompts the user can click to explore the review further. Examples: 'Explain the retry loop issue', 'How do I fix the auth gap?', 'Is this PR safe to merge?', 'Show me the security findings'."
    ),
  praise: z.array(z.string()).describe("Notable things the pull request does well."),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().describe("Two to three sentence overview of the pull request review."),
  verdict: z.enum(["approve", "request-changes", "needs-discussion"]),
});

export const ReviewGenerationSchema = ReviewSchema.omit({
  followUpSuggestions: true,
}).extend({
  // Anthropic's structured output schema support is stricter than plain JSON
  // Schema support and rejects array minItems > 1. We generate with a looser
  // schema, then normalize and validate against the stricter app contract.
  followUpSuggestions: z.array(z.string()),
});

export type Finding = z.infer<typeof FindingSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type ReviewGeneration = z.infer<typeof ReviewGenerationSchema>;

const DEFAULT_FOLLOW_UP_SUGGESTIONS = [
  "Explain the highest-risk finding",
  "How would you fix this PR?",
  "Is this PR safe to merge?",
  "Show me the security findings",
] as const;

export function normalizeReviewOutput(review: ReviewGeneration): Review {
  const followUpSuggestions = Array.from(
    new Set(
      review.followUpSuggestions
        .map((suggestion) => suggestion.trim())
        .filter(Boolean),
    ),
  ).slice(0, 4);

  for (const fallback of DEFAULT_FOLLOW_UP_SUGGESTIONS) {
    if (followUpSuggestions.length >= 2) {
      break;
    }

    if (!followUpSuggestions.includes(fallback)) {
      followUpSuggestions.push(fallback);
    }
  }

  return ReviewSchema.parse({
    ...review,
    followUpSuggestions,
  });
}
