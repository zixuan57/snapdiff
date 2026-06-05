import {
  ensureDirs,
  captureSnapshot,
  captureSnapshotsParallel,
  baselineImagePath,
  diffImagePath,
  compareSnapshots,
  loadConfig,
  generateReportSummary,
  generateHtmlReport,
  baselineExists,
} from "../core/index.js";
import pc from "picocolors";
import { unlink } from "node:fs/promises";

export async function diffCommand(
  url: string | undefined,
  options: { name?: string; threshold?: string }
) {
  const cwd = process.cwd();
  await ensureDirs(cwd);
  const threshold = parseFloat(options.threshold || "0.1");

  // No args → run all snaps from config (parallel capture)
  if (!url && !options.name) {
    const config = await loadConfig(cwd);
    if (!config || config.snaps.length === 0) {
      console.log(pc.yellow("⚠ 未找到配置，请先运行 snapdiff init 或提供参数"));
      console.log(`  ${pc.bold("npx snapdiff diff <url> --name <name>")}`);
      return;
    }

    // Check which snaps have baselines
    const validSnaps = [];
    for (const snap of config.snaps) {
      if (await baselineExists(cwd, snap.name)) {
        validSnaps.push(snap);
      } else {
        console.log(pc.yellow(`\n  ⚠ "${snap.name}" 还没有基线截图。`));
        console.log(`     ${pc.bold("npx snapdiff capture " + snap.url + " --name " + snap.name)}`);
      }
    }

    if (validSnaps.length === 0) {
      console.log(pc.dim("\n  没有需要对比的页面。"));
      return;
    }

    console.log(pc.cyan(`\n  正在并行截取 ${validSnaps.length} 个页面...`));
    const timestamp = String(Math.floor(Date.now() / 1000));

    // Phase 1: capture all current states in parallel
    const captureTasks = validSnaps.map((snap) => ({
      config: {
        ...snap,
        viewport: snap.viewport ?? { width: 1440, height: 900 },
        threshold: snap.threshold ?? 0.1,
      },
      outputPath: baselineImagePath(cwd, "current-" + snap.name),
    }));

    const captureResults = await captureSnapshotsParallel(captureTasks, 3);

    // Phase 2: compare all diffs (sequential, fast operations)
    const results = [];
    for (let i = 0; i < validSnaps.length; i++) {
      const snap = validSnaps[i];
      const currentPath = captureResults[i].imagePath;

      const diffOut = diffImagePath(cwd, snap.name, timestamp);
      const result = await compareSnapshots({
        baselinePath: baselineImagePath(cwd, snap.name),
        currentPath,
        diffOutputPath: diffOut,
        threshold: threshold / 100,
      });
      result.name = snap.name;
      result.url = snap.url;
      results.push(result);

      await unlink(currentPath).catch(() => {});

      if (result.error) {
        console.log("  ⚠ " + snap.name + ": " + result.error);
      } else if (result.passed) {
        console.log(pc.green("  ✅ " + snap.name + " ── 无变化 (差异 " + result.diffPercent + "%)"));
      } else {
        const bar = makeBar(result.diffPercent, 20);
        console.log("  ❌ " + snap.name);
        console.log("     " + bar + " " + result.diffPercent + "% (" + result.diffPixels + " 像素)");
        console.log(pc.dim("     📄 diff 图: " + result.diffImagePath));
        console.log(pc.cyan("     如果这是预期的变更: " + pc.bold("npx snapdiff approve " + snap.name)));
      }
    }

    if (results.length > 0) {
      console.log(generateReportSummary(results));
      const htmlPath = await generateHtmlReport(results, cwd);
      console.log(pc.cyan("\n  📊 HTML 报告: " + htmlPath));
    }
    return;
  }

  // Single URL mode
  if (!url || !options.name) {
    console.log(pc.yellow("请提供 URL 和名称："));
    console.log("  " + pc.bold("npx snapdiff diff <url> --name <name>"));
    return;
  }

  const name = options.name;
  if (!(await baselineExists(cwd, name))) {
    console.log(pc.yellow('\n  ⚠ "' + name + '" 还没有基线截图。'));
    console.log("  请先运行: " + pc.bold("npx snapdiff capture " + url + " --name " + name));
    return;
  }

  console.log(pc.cyan("正在对比 " + name + "..."));
  const viewport = { width: 1440, height: 900 };
  const t = String(Math.floor(Date.now() / 1000));
  const currentPath = baselineImagePath(cwd, "current-" + name);

  const { imagePath: curPath } = await captureSnapshot({
    config: { name, url, viewport, threshold: threshold / 100 },
    outputPath: currentPath,
  });

  const diffOut = diffImagePath(cwd, name, t);
  const result = await compareSnapshots({
    baselinePath: baselineImagePath(cwd, name),
    currentPath: curPath,
    diffOutputPath: diffOut,
    threshold: threshold / 100,
  });
  result.name = name;
  result.url = url;

  await unlink(curPath).catch(() => {});

  if (result.error) {
    console.log("  ⚠ " + result.error);
  } else if (result.passed) {
    console.log(pc.green("  ✅ 无变化 (差异 " + result.diffPercent + "%)"));
  } else {
    const bar = makeBar(result.diffPercent, 20);
    console.log("  ❌ " + name);
    console.log("     " + bar + " " + result.diffPercent + "% (" + result.diffPixels + " 像素)");
    console.log(pc.dim("     📄 diff 图: " + result.diffImagePath));
    console.log(pc.cyan("  如果这是预期的变更: " + pc.bold("npx snapdiff approve " + name)));
  }

  const htmlPath = await generateHtmlReport([result], cwd);
  console.log(pc.cyan("\n  📊 HTML 报告: " + htmlPath));
}

function makeBar(percent: number, width: number): string {
  const filled = Math.min(Math.round((percent / 100) * width), width);
  const empty = width - filled;
  return pc.red("█".repeat(filled)) + pc.dim("░".repeat(empty));
}

