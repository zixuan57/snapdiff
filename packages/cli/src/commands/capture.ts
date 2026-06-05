import {
  ensureDirs,
  captureSnapshotsParallel,
  baselineImagePath,
  saveBaselineMeta,
  loadConfig,
} from "../core/index.js";
import pc from "picocolors";

export async function captureCommand(
  url: string | undefined,
  options: { name?: string; selector?: string; width?: string; height?: string }
) {
  const cwd = process.cwd();
  const viewport = {
    width: parseInt(options.width || "1440", 10),
    height: parseInt(options.height || "900", 10),
  };

  // No args → use config file (parallel)
  if (!url && !options.name) {
    const config = await loadConfig(cwd);
    if (!config || config.snaps.length === 0) {
      console.log(pc.yellow("⚠ 未找到配置，请先运行 snapdiff init 或提供 URL 参数"));
      console.log(`  用法: ${pc.bold("npx snapdiff capture <url> --name <name>")}`);
      return;
    }

    await ensureDirs(cwd);
    console.log(pc.cyan(`\n  正在并行截取 ${config.snaps.length} 个页面...`));

    const tasks = config.snaps.map((snap) => ({
      config: { ...snap, viewport: snap.viewport ?? viewport, threshold: snap.threshold ?? 0.1 },
      outputPath: baselineImagePath(cwd, snap.name),
    }));

    const results = await captureSnapshotsParallel(tasks, 3);
    for (let i = 0; i < results.length; i++) {
      await saveBaselineMeta(cwd, config.snaps[i].name, results[i].meta);
      console.log(pc.green(`  ✔ ${config.snaps[i].url} ── 基线已保存`));
    }
    return;
  }

  // Single URL mode
  if (!url || !options.name) {
    console.log(pc.yellow("请提供 URL 和名称："));
    console.log(`  ${pc.bold("npx snapdiff capture <url> --name <name>")}`);
    return;
  }

  await ensureDirs(cwd);
  const { captureSnapshot } = await import("@snapdiff/core");
  const snap = {
    name: options.name,
    url,
    selector: options.selector,
    viewport,
    threshold: 0.1,
  };

  console.log(pc.cyan(`\n  正在截取 ${snap.name}...`));
  const { imagePath, meta } = await captureSnapshot({
    config: snap,
    outputPath: baselineImagePath(cwd, snap.name),
  });
  await saveBaselineMeta(cwd, snap.name, meta);
  console.log(pc.green(`  ✔ ${url} ── 基线已保存`));
}

