import { describe, it, expect } from "vitest";
import { compareSnapshots } from "../diff.js";
import { PNG } from "pngjs";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

function createPng(width: number, height: number, fillR = 255, fillG = 255, fillB = 255): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      png.data[idx] = fillR;
      png.data[idx + 1] = fillG;
      png.data[idx + 2] = fillB;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

async function withTempFiles(fn: (paths: { baseline: string; current: string; diff: string }) => Promise<void>) {
  const tmpDir = join(process.cwd(), ".test-diff-" + Date.now() + Math.random().toString(36).slice(2));
  await mkdir(tmpDir, { recursive: true });
  const paths = {
    baseline: join(tmpDir, "baseline.png"),
    current: join(tmpDir, "current.png"),
    diff: join(tmpDir, "diff.png"),
  };
  try {
    await fn(paths);
  } finally {
    for (const p of Object.values(paths)) {
      await unlink(p).catch(() => {});
    }
    await unlink(tmpDir).catch(() => {});
  }
}

describe("compareSnapshots", () => {
  it("returns passed=true for identical images", async () => {
    await withTempFiles(async (paths) => {
      const img = createPng(100, 100);
      await writeFile(paths.baseline, img);
      await writeFile(paths.current, img);

      const result = await compareSnapshots({
        baselinePath: paths.baseline,
        currentPath: paths.current,
        diffOutputPath: paths.diff,
        threshold: 0.1,
      });

      expect(result.passed).toBe(true);
      expect(result.diffPixels).toBe(0);
      expect(result.diffPercent).toBe(0);
    });
  });

  it("returns passed=false for different images", async () => {
    await withTempFiles(async (paths) => {
      await writeFile(paths.baseline, createPng(100, 100, 255, 255, 255));
      await writeFile(paths.current, createPng(100, 100, 0, 0, 0));

      const result = await compareSnapshots({
        baselinePath: paths.baseline,
        currentPath: paths.current,
        diffOutputPath: paths.diff,
        threshold: 0.001,
      });

      expect(result.passed).toBe(false);
      expect(result.diffPixels).toBeGreaterThan(0);
      expect(result.diffPercent).toBeGreaterThan(0);
    });
  });

  it("returns error for mismatched dimensions", async () => {
    await withTempFiles(async (paths) => {
      await writeFile(paths.baseline, createPng(100, 100));
      await writeFile(paths.current, createPng(200, 200));

      const result = await compareSnapshots({
        baselinePath: paths.baseline,
        currentPath: paths.current,
        diffOutputPath: paths.diff,
        threshold: 0.1,
      });

      expect(result.passed).toBe(false);
      expect(result.error).toContain("baseline 100x100, current 200x200");
    });
  });

  it("generates diff image file on mismatch", async () => {
    await withTempFiles(async (paths) => {
      await writeFile(paths.baseline, createPng(50, 50, 255, 255, 255));
      await writeFile(paths.current, createPng(50, 50, 0, 0, 0));

      const result = await compareSnapshots({
        baselinePath: paths.baseline,
        currentPath: paths.current,
        diffOutputPath: paths.diff,
        threshold: 0.001,
      });

      expect(result.passed).toBe(false);
      expect(result.diffImagePath).toBe(paths.diff);

      const { readFile } = await import("node:fs/promises");
      const diffBuf = await readFile(paths.diff);
      expect(diffBuf.length).toBeGreaterThan(0);
    });
  });
});

  it("masks specified regions before comparison", async () => {
    await withTempFiles(async (paths) => {
      await writeFile(paths.baseline, createPng(100, 100, 255, 255, 255));
      await writeFile(paths.current, createPng(100, 100, 0, 0, 0));

      const result = await compareSnapshots({
        baselinePath: paths.baseline,
        currentPath: paths.current,
        diffOutputPath: paths.diff,
        threshold: 0.001,
        maskRegions: [{ x: 0, y: 0, width: 100, height: 100 }],
      });

      expect(result.passed).toBe(true);
      expect(result.diffPixels).toBe(0);
    });
  });

  it("partial mask still detects unmasked differences", async () => {
    await withTempFiles(async (paths) => {
      await writeFile(paths.baseline, createPng(100, 100, 255, 255, 255));
      await writeFile(paths.current, createPng(100, 100, 0, 0, 0));

      const result = await compareSnapshots({
        baselinePath: paths.baseline,
        currentPath: paths.current,
        diffOutputPath: paths.diff,
        threshold: 0.001,
        maskRegions: [{ x: 0, y: 0, width: 100, height: 50 }],
      });

      expect(result.passed).toBe(false);
      expect(result.diffPixels).toBe(5000);
    });
  });
