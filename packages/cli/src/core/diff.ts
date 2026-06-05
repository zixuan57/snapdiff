import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { readFile, writeFile } from "node:fs/promises";
import { DiffResult } from "./types.js";

export interface DiffOptions {
  baselinePath: string;
  currentPath: string;
  diffOutputPath: string;
  threshold: number; // 0-1 percentage of pixels, default 0.001
  maskRegions?: Array<{ x: number; y: number; width: number; height: number }>;
}

function applyMask(png: PNG, region: { x: number; y: number; width: number; height: number }): void {
  const { x, y, width, height } = region;
  const maxX = Math.min(x + width, png.width);
  const maxY = Math.min(y + height, png.height);
  for (let row = y; row < maxY; row++) {
    for (let col = x; col < maxX; col++) {
      const idx = (row * png.width + col) * 4;
      png.data[idx] = 128;
      png.data[idx + 1] = 128;
      png.data[idx + 2] = 128;
      png.data[idx + 3] = 255;
    }
  }
}

export async function compareSnapshots(
  options: DiffOptions
): Promise<DiffResult> {
  const { baselinePath, currentPath, diffOutputPath, threshold, maskRegions } = options;

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
      error: `\u5c3a\u5bf8\u4e0d\u5339\u914d: baseline ${baselinePng.width}x${baselinePng.height}, current ${currentPng.width}x${currentPng.height}`,
    };
  }

  // Apply mask regions before comparison (both images get same mask)
  if (maskRegions) {
    for (const region of maskRegions) {
      applyMask(baselinePng, region);
      applyMask(currentPng, region);
    }
  }

  const diff = new PNG({ width: baselinePng.width, height: baselinePng.height });
  const diffPixels = pixelmatch(
    baselinePng.data,
    currentPng.data,
    diff.data,
    baselinePng.width,
    baselinePng.height,
    { threshold }
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
