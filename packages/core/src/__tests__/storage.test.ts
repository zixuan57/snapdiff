import { sep } from "node:path";
import { describe, it, expect } from "vitest";
import { baselineImagePath, baselineMetaPath, diffImagePath } from "../storage.js";

describe("storage paths", () => {
  const cwd = "/tmp/project";

  it("baselineImagePath returns correct path", () => {
    const result = baselineImagePath(cwd, "homepage");
    expect(result).toContain(`.snapdiff${sep}baselines${sep}homepage.png`);
  });

  it("baselineMetaPath returns correct path", () => {
    const result = baselineMetaPath(cwd, "homepage");
    expect(result).toContain(`.snapdiff${sep}baselines${sep}homepage.json`);
  });

  it("diffImagePath includes name and timestamp", () => {
    const result = diffImagePath(cwd, "homepage", "1234567890");
    expect(result).toContain(`.snapdiff${sep}diffs${sep}homepage-1234567890-diff.png`);
  });

  it("baselineImagePath handles names with special chars", () => {
    const result1 = baselineImagePath(cwd, "my-page");
    const result2 = baselineImagePath(cwd, "my_page");
    expect(result1).toContain("my-page.png");
    expect(result2).toContain("my_page.png");
  });
});
