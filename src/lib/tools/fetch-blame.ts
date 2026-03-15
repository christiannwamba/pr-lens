import { tool } from "ai";
import { z } from "zod";

import { githubGraphQL, githubFetch } from "@/lib/github";

type GraphQLBlameResponse = {
  repository: {
    object:
      | {
          blame?: {
            ranges?: Array<{
              commit: {
                author?: {
                  name?: string | null;
                } | null;
                authoredDate: string;
                message: string;
              };
              endingLine: number;
              startingLine: number;
            }>;
          };
        }
      | null;
  } | null;
};

type CommitHistoryResponse = Array<{
  commit: {
    author: {
      date: string;
      name: string;
    };
    message: string;
  };
  sha: string;
}>;

function encodeRepoPath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export const fetchBlame = tool({
  description: "Fetch git blame for a file to understand who changed what and when.",
  inputSchema: z.object({
    branch: z.string(),
    owner: z.string(),
    path: z.string(),
    repo: z.string(),
  }),
  execute: async ({ branch, owner, path, repo }) => {
    try {
      const result = await githubGraphQL<GraphQLBlameResponse>(
        `query($owner: String!, $repo: String!, $expression: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $expression) {
              ... on Blob {
                blame {
                  ranges {
                    startingLine
                    endingLine
                    commit {
                      message
                      authoredDate
                      author {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        {
          expression: `${branch}:${path}`,
          owner,
          repo,
        },
      );

      const ranges = result.repository?.object?.blame?.ranges ?? [];

      return {
        branch,
        path,
        ranges: ranges.slice(0, 30).map((range) => ({
          author: range.commit.author?.name ?? "Unknown",
          date: range.commit.authoredDate,
          endLine: range.endingLine,
          message: range.commit.message.split("\n")[0],
          startLine: range.startingLine,
        })),
        source: "graphql" as const,
      };
    } catch {
      const response = await githubFetch(
        `/repos/${owner}/${repo}/commits?path=${encodeRepoPath(path)}&sha=${encodeURIComponent(branch)}&per_page=10`,
      );
      const commits = (await response.json()) as CommitHistoryResponse;

      return {
        branch,
        path,
        recentCommits: commits.map((commit) => ({
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          message: commit.commit.message.split("\n")[0],
          sha: commit.sha.slice(0, 7),
        })),
        source: "rest-fallback" as const,
      };
    }
  },
});
