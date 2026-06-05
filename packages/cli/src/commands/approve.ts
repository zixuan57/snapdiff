import pc from "picocolors";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { baselineImagePath, ensureDirs, captureSnapshot, saveBaselineMeta, loadConfig, baselineExists } from "../core/index.js";

export async function approveCommand(name: string) {
  const cwd = process.cwd();

  if (!(await baselineExists(cwd, name))) {
    console.log(pc.yellow(`⚠  "${name}" 没有基线截图，无法接受。`));
    console.log(`  请先运行: ${pc.bold(`npx snapdiff capture <url> --name ${name}`)}`);
    return;
  }

  // Try loading config, fallback to minimal inline config
  let config = await loadConfig(cwd);
  let snap = config?.snaps.find((s) => s.name === name);

  if (!snap) {
    // Try reading the baseline meta json for URL info
    const metaPath = join(cwd, ".snapdiff", "baselines", `${name}.json`);
    let url = "";
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      url = meta.url || "";
    } catch {}

    if (!url) {
      console.log(pc.yellow(`⚠ 未找到 "${name}" 的配置，也无法从基线元数据中恢复 URL。`));
      console.log(`  请先运行: ${pc.bold(`npx snapdiff capture <url> --name ${name}`)}`);
      return;
    }

    // Reconstruct a minimal snap config from metadata
    console.log(pc.dim(`  从基线元数据恢复配置: ${url}`));
    snap = { name, url, viewport: { width: 1440, height: 900 }, threshold: 0.1 };
  }

  await ensureDirs(cwd);
  const viewport = snap.viewport ?? { width: 1440, height: 900 };

  console.log(pc.cyan(`\n  正在将 "${name}" 的当前状态接受为新基线...`));
  try {
    const { imagePath, meta } = await captureSnapshot({
      config: { ...snap, viewport },
      outputPath: baselineImagePath(cwd, name),
    });
    await saveBaselineMeta(cwd, name, meta);
    console.log(pc.green(`  ✔ 基线已更新: ${snap.url}`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(pc.red(`  ✗ 接受失败: ${msg}`));
  }
}


