import { tool } from "ai";
import { z } from "zod";

import { GitHubApiError, githubFetch } from "@/lib/github";

type RepositoryFileResponse = {
  content?: string;
  encoding?: string;
  type: string;
};

// Convention files fetched in parallel via Promise.allSettled — missing files
// (404) are silently skipped since most repos only have a subset of these.
// Each file is truncated to 3,000 chars to avoid blowing the context budget
// on verbose READMEs while still capturing meaningful style/config signals.
const GUIDELINE_FILES = [
  "README.md",
  "CONTRIBUTING.md",
  ".github/CONTRIBUTING.md",
  "eslint.config.js",
  "eslint.config.mjs",
  ".eslintrc.json",
  ".prettierrc",
  ".prettierrc.json",
  "tsconfig.json",
  ".github/pull_request_template.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
];
const MAX_GUIDELINE_CHARS = 3_000;

async function readGuidelineFile(owner: string, repo: string, ref: string, file: string) {
  const response = await githubFetch(
    `/repos/${owner}/${repo}/contents/${file}?ref=${encodeURIComponent(ref)}`,
  );
  const data = (await response.json()) as RepositoryFileResponse;

  if (data.type !== "file" || data.encoding !== "base64" || !data.content) {
    return null;
  }

  return Buffer.from(data.content.replace(/\n/g, ""), "base64")
    .toString("utf8")
    .slice(0, MAX_GUIDELINE_CHARS);
}

export const fetchRepoGuidelines = tool({
  description:
    "Fetch repo convention files such as CONTRIBUTING, lint config, tsconfig, and PR templates.",
  inputSchema: z.object({
    owner: z.string(),
    ref: z.string(),
    repo: z.string(),
  }),
  execute: async ({ owner, ref, repo }) => {
    const settled = await Promise.allSettled(
      GUIDELINE_FILES.map(async (file) => {
        const content = await readGuidelineFile(owner, repo, ref, file);

        return content
          ? {
              content,
              file,
            }
          : null;
      }),
    );

    const guidelines: Record<string, string> = {};

    for (const result of settled) {
      if (result.status === "fulfilled") {
        if (result.value) {
          guidelines[result.value.file] = result.value.content;
        }
        continue;
      }

      const reason = result.reason;
      if (reason instanceof GitHubApiError && reason.status === 404) {
        continue;
      }

      throw reason;
    }

    return {
      filesFound: Object.keys(guidelines),
      guidelines,
    };
  },
});
