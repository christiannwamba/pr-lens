import { describe, expect, it } from "vitest";

import { parsePRUrl } from "./utils";

describe("parsePRUrl", () => {
  it("parses a standard GitHub pull request URL", () => {
    expect(parsePRUrl("https://github.com/vercel/next.js/pull/12345")).toEqual({
      owner: "vercel",
      repo: "next.js",
      prNumber: 12345,
    });
  });

  it("accepts pasted URLs with query strings, fragments, and surrounding whitespace", () => {
    expect(
      parsePRUrl("  https://github.com/acme/api/pull/247/files?diff=split#discussion  "),
    ).toEqual({
      owner: "acme",
      repo: "api",
      prNumber: 247,
    });
  });

  it("returns null for non-pull-request URLs", () => {
    expect(parsePRUrl("https://github.com/vercel/next.js/issues/12345")).toBeNull();
    expect(parsePRUrl("not a url")).toBeNull();
  });
});
