import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SnapConfig } from "./types.js";

export interface ProjectConfig {
  snaps: SnapConfig[];
  ci?: {
    mode: "strict" | "auto-capture";
  };
}

const CONFIG_FILES = [
  "snapdiff.config.ts",
  "snapdiff.config.js",
  "snapdiff.config.json",
  ".snapdiffrc",
  ".snapdiffrc.json",
];

function stripBom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

export async function loadConfig(cwd: string): Promise<ProjectConfig | null> {
  for (const file of CONFIG_FILES) {
    const path = join(cwd, file);
    if (!existsSync(path)) continue;

    if (file.endsWith(".json") || file === ".snapdiffrc") {
      try {
        const raw = await readFile(path, "utf-8");
        return JSON.parse(stripBom(raw));
      } catch (err) {
        const msg = err instanceof SyntaxError
          ? `配置文件 ${file} 格式错误，请检查 JSON 语法`
          : `读取配置文件 ${file} 失败: ${err instanceof Error ? err.message : err}`;
        console.error(`  ⚠ ${msg}`);
        return null;
      }
    }

    if (file.endsWith(".ts") || file.endsWith(".js")) {
      console.warn("  ⚠ TypeScript/JS 配置文件当前版本暂不支持，请使用 snapdiff.config.json");
      continue;
    }
  }
  return null;
}

export function defaultConfig(): ProjectConfig {
  return { snaps: [] };
}
