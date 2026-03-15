import { tool } from "ai";
import { z } from "zod";

import { githubFetch } from "@/lib/github";

type RepositoryFileResponse = {
  content?: string;
  encoding?: string;
  path: string;
  type: string;
};

const MAX_LINES = 500;

function encodeRepoPath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export const fetchFileContent = tool({
  description: "Fetch the full content of a file at a specific git ref.",
  inputSchema: z.object({
    owner: z.string(),
    path: z.string(),
    ref: z
      .string()
      .describe("Git ref to read from. For changed PR files, prefer the headSha returned by fetch_pr_diff."),
    repo: z.string(),
  }),
  execute: async ({ owner, path, ref, repo }) => {
    const response = await githubFetch(
      `/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}?ref=${encodeURIComponent(ref)}`,
    );
    const data = (await response.json()) as RepositoryFileResponse | RepositoryFileResponse[];

    if (Array.isArray(data) || data.type !== "file" || data.encoding !== "base64" || !data.content) {
      throw new Error(`Unable to read file contents for ${path} at ${ref}.`);
    }

    const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
    const lines = content.split("\n");
    const truncated = lines.length > MAX_LINES;

    return {
      content: truncated
        ? `${lines.slice(0, MAX_LINES).join("\n")}\n... [truncated at ${MAX_LINES} lines]`
        : content,
      path,
      ref,
      totalLines: lines.length,
      truncated,
    };
  },
});
