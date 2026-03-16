import { tool } from "ai";
import { z } from "zod";

import { githubFetch } from "@/lib/github";

type PullRequestResponse = {
  additions: number;
  body: string | null;
  changed_files: number;
  deletions: number;
  head: {
    ref: string;
    sha: string;
  };
  title: string;
  base: {
    ref: string;
  };
  user: {
    login: string;
  };
};

type PullRequestFileResponse = {
  additions: number;
  deletions: number;
  filename: string;
  patch?: string;
  status: string;
};

// Truncate individual file patches to 500 lines to keep total context within
// the model's budget. Large diffs (e.g., generated files, lock files) would
// otherwise dominate the context window and crowd out meaningful code.
// The model can use fetch_file_content to inspect specific files in full if needed.
const MAX_PATCH_LINES = 500;

export const fetchPRDiff = tool({
  description: "Fetch PR metadata and changed files with patches from GitHub.",
  inputSchema: z.object({
    owner: z.string(),
    prNumber: z.number().int().positive(),
    repo: z.string(),
  }),
  execute: async ({ owner, prNumber, repo }) => {
    const prResponse = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`);
    const pr = (await prResponse.json()) as PullRequestResponse;

    const filesResponse = await githubFetch(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    );
    const files = (await filesResponse.json()) as PullRequestFileResponse[];

    return {
      additions: pr.additions,
      author: pr.user.login,
      baseRef: pr.base.ref,
      body: pr.body?.slice(0, 2_000) ?? "",
      changedFileCount: pr.changed_files,
      deletions: pr.deletions,
      fetchedFileCount: files.length,
      files: files.map((file) => {
        const patch = file.patch ?? "";
        const lines = patch.split("\n");
        const truncated = lines.length > MAX_PATCH_LINES;

        return {
          additions: file.additions,
          deletions: file.deletions,
          filename: file.filename,
          patch: truncated
            ? `${lines.slice(0, MAX_PATCH_LINES).join("\n")}\n... [truncated]`
            : patch,
          status: file.status,
          truncated,
        };
      }),
      filesTruncated: pr.changed_files > files.length,
      headRef: pr.head.ref,
      headSha: pr.head.sha,
      title: pr.title,
    };
  },
});
