import { tool } from "ai";
import { z } from "zod";

import { githubFetch } from "@/lib/github";

type SearchIssuesResponse = {
  items?: Array<{
    body: string | null;
    number: number;
    state: string;
    title: string;
  }>;
};

export const fetchRelatedIssues = tool({
  description: "Search repository issues related to the PR changes.",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    searchTerms: z.array(z.string()).describe("Keywords to search for in repository issues."),
  }),
  execute: async ({ owner, repo, searchTerms }) => {
    const normalizedTerms = searchTerms.map((term) => term.trim()).filter(Boolean);

    if (normalizedTerms.length === 0) {
      return { issues: [] };
    }

    const query = `${normalizedTerms.join(" ")} repo:${owner}/${repo} type:issue`;
    const response = await githubFetch(
      `/search/issues?q=${encodeURIComponent(query)}&per_page=5`,
    );
    const data = (await response.json()) as SearchIssuesResponse;

    return {
      issues: (data.items ?? []).map((issue) => ({
        body: issue.body?.slice(0, 200) ?? "",
        number: issue.number,
        state: issue.state,
        title: issue.title,
      })),
    };
  },
});
