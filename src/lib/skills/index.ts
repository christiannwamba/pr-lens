import { readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIR = join(process.cwd(), "src", "lib", "skills");

export const SKILL_TOOL_MAP = {
  "compare-patterns": ["fetch_repo_guidelines", "fetch_file_content"],
  "explain-finding": ["fetch_pr_diff", "fetch_file_content", "fetch_blame"],
  "explore-history": ["fetch_blame", "fetch_related_issues"],
  "review-pr": [
    "fetch_pr_diff",
    "fetch_repo_guidelines",
    "fetch_file_content",
    "fetch_blame",
    "fetch_related_issues",
    "generate_structured_review",
  ],
  "suggest-fix": ["fetch_file_content"],
} as const;

export type SkillName = keyof typeof SKILL_TOOL_MAP;

export type Skill = {
  description: string;
  instructions: string;
  name: SkillName;
  tools: string[];
};

function parseFrontmatter(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed.startsWith("---")) {
    return {
      content: trimmed,
      data: {} as Record<string, string>,
    };
  }

  const endIndex = trimmed.indexOf("\n---", 3);

  if (endIndex === -1) {
    return {
      content: trimmed,
      data: {} as Record<string, string>,
    };
  }

  const frontmatterBlock = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 4).trim();
  const data: Record<string, string> = {};

  for (const line of frontmatterBlock.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    data[key] = value;
  }

  return { content, data };
}

export function loadSkill(name: SkillName): Skill {
  const filePath = join(SKILLS_DIR, `${name}.md`);
  const raw = readFileSync(filePath, "utf8");
  const { content, data } = parseFrontmatter(raw);

  return {
    description: data.description ?? "",
    instructions: content,
    name,
    tools: [...SKILL_TOOL_MAP[name]],
  };
}

export function listSkills(): Array<{ description: string; name: SkillName }> {
  return (Object.keys(SKILL_TOOL_MAP) as SkillName[]).map((name) => {
    const skill = loadSkill(name);

    return {
      description: skill.description,
      name: skill.name,
    };
  });
}

export function getSkillToolMap() {
  return Object.fromEntries(
    (Object.keys(SKILL_TOOL_MAP) as SkillName[]).map((name) => [name, [...SKILL_TOOL_MAP[name]]]),
  ) as Record<SkillName, string[]>;
}
