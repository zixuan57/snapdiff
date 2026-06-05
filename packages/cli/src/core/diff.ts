import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { readFile, writeFile } from "node:fs/promises";
import { DiffResult } from "./types.js";

export interface DiffOptions {
  baselinePath: string;
  currentPath: string;
  diffOutputPath: string;
  threshold: number; // 0-1 percentage of pixels, default 0.001
}

export async function compareSnapshots(
  options: DiffOptions
): Promise<DiffResult> {
  const { baselinePath, currentPath, diffOutputPath, threshold } = options;

  const baselinePng = PNG.sync.read(await readFile(baselinePath));
  const currentPng = PNG.sync.read(await readFile(currentPath));

  if (
    baselinePng.width !== currentPng.width ||
    baselinePng.height !== currentPng.height
  ) {
    return {
      name: "",
      url: "",
      diffPixels: 0,
      totalPixels: 0,
      diffPercent: 0,
      passed: false,
      error: `尺寸不匹配: baseline ${baselinePng.width}x${baselinePng.height}, current ${currentPng.width}x${currentPng.height}`,
    };
  }

  const diff = new PNG({ width: baselinePng.width, height: baselinePng.height });
  const diffPixels = pixelmatch(
    baselinePng.data,
    currentPng.data,
    diff.data,
    baselinePng.width,
    baselinePng.height,
    { threshold: 0.1 }
  );

  const totalPixels = baselinePng.width * baselinePng.height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const passed = diffPercent <= threshold * 100;

  await writeFile(diffOutputPath, PNG.sync.write(diff));

  return {
    name: "",
    url: "",
    diffPixels,
    totalPixels,
    diffPercent: Math.round(diffPercent * 100) / 100,
    passed,
    diffImagePath: diffOutputPath,
  };
}
