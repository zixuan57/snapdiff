export { existsSync, mkdirSync } from "node:fs";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BaselineMeta } from "./types.js";

const BASELINE_DIR = ".snapdiff/baselines";
const DIFF_DIR = ".snapdiff/diffs";
const CONFIG_DIR = ".snapdiff";
const TMP_DIR = ".snapdiff/tmp";

export async function ensureDirs(cwd: string) {
  const dirs = [
    join(cwd, CONFIG_DIR),
    join(cwd, BASELINE_DIR),
    join(cwd, DIFF_DIR),
    join(cwd, TMP_DIR),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

export function baselineImagePath(cwd: string, name: string): string {
  return join(cwd, BASELINE_DIR, `${name}.png`);
}

export function baselineMetaPath(cwd: string, name: string): string {
  return join(cwd, BASELINE_DIR, `${name}.json`);
}

export function diffImagePath(cwd: string, name: string, timestamp: string): string {
  return join(cwd, DIFF_DIR, `${name}-${timestamp}-diff.png`);
}

export async function saveBaselineMeta(
  cwd: string,
  name: string,
  meta: BaselineMeta
): Promise<void> {
  const dir = join(cwd, BASELINE_DIR);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(baselineMetaPath(cwd, name), JSON.stringify(meta, null, 2));
}

export async function loadBaselineMeta(
  cwd: string,
  name: string
): Promise<BaselineMeta | null> {
  const path = baselineMetaPath(cwd, name);
  if (!existsSync(path)) return null;
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function baselineExists(cwd: string, name: string): Promise<boolean> {
  return existsSync(baselineImagePath(cwd, name));
}

export async function listBaselines(cwd: string): Promise<
  Array<{ name: string; meta: BaselineMeta | null }>
> {
  const dir = join(cwd, BASELINE_DIR);
  if (!existsSync(dir)) return [];

  try {
    const files = await readdir(dir);
    const pngFiles = files.filter((f) => f.endsWith(".png"));
    const results: Array<{ name: string; meta: BaselineMeta | null }> = [];

    for (const file of pngFiles) {
      const name = file.replace(/\.png$/, "");
      const meta = await loadBaselineMeta(cwd, name);
      results.push({ name, meta });
    }

    return results;
  } catch {
    return [];
  }
}
