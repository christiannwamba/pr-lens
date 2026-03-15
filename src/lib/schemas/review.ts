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
  praise: z.array(z.string()).describe("Notable things the pull request does well."),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().describe("Two to three sentence overview of the pull request review."),
  verdict: z.enum(["approve", "request-changes", "needs-discussion"]),
});

export type Finding = z.infer<typeof FindingSchema>;
export type Review = z.infer<typeof ReviewSchema>;
