import { describe, expect, it } from "vitest";

import { listSkills, loadSkill } from "./index";

describe("skills", () => {
  it("loads the review-pr skill with its tool list", () => {
    const skill = loadSkill("review-pr");

    expect(skill.name).toBe("review-pr");
    expect(skill.tools).toContain("generate_structured_review");
    expect(skill.instructions).toContain("PR Review");
  });

  it("lists all configured skills", () => {
    const skills = listSkills();

    expect(skills).toHaveLength(5);
    expect(skills.map((skill) => skill.name)).toContain("suggest-fix");
  });
});
