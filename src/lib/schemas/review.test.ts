import { describe, expect, it } from "vitest";

import { ReviewSchema } from "./review";

describe("ReviewSchema", () => {
  it("accepts a valid structured review", () => {
    expect(() =>
      ReviewSchema.parse({
        findings: [
          {
            description: "User-controlled input is concatenated into a SQL query.",
            file: "src/auth.ts",
            lineRange: "L42-L58",
            rubric: "security",
            severity: "critical",
            suggestion: "Use parameterized queries.",
            title: "SQL injection in login query",
          },
        ],
        followUpSuggestions: [
          "Explain the security finding",
          "Show me the highest-risk area",
        ],
        praise: ["Good test coverage on the happy path."],
        riskLevel: "high",
        summary: "This PR adds authentication but introduces a serious security issue.",
        verdict: "request-changes",
      }),
    ).not.toThrow();
  });
});
