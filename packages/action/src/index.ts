import { getInput, setFailed, notice, warning, info } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import {
  ensureDirs,
  baselineExists,
  captureSnapshot,
  compareSnapshots,
  baselineImagePath,
  diffImagePath,
  loadBaselineMeta,
  saveBaselineMeta,
  loadConfig,
  generateTextReport,
  generateReportSummary,
} from "@snapdiff/core";
import { unlink } from "node:fs/promises";

async function run() {
  try {
    const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
    const threshold = parseFloat(getInput("threshold") || "0.1");
    await ensureDirs(cwd);

    const config = await loadConfig(cwd);
    if (!config || config.snaps.length === 0) {
      warning("未找到 snapdiff.config.json 配置");
      return;
    }

    const results = [];
    for (const snap of config.snaps) {
      const viewport = snap.viewport ?? { width: 1440, height: 900 };
      const baselinePath = baselineImagePath(cwd, snap.name);

      if (!(await baselineExists(cwd, snap.name))) {
        warning(`⚠ "${snap.name}" 没有基线截图，跳过`);
        continue;
      }

      const timestamp = String(Math.floor(Date.now() / 1000));
      const currentPath = baselineImagePath(cwd, `current-${snap.name}`);

      const { imagePath: curPath } = await captureSnapshot({
        config: { ...snap, viewport },
        outputPath: currentPath,
      });

      const diffOut = diffImagePath(cwd, snap.name, timestamp);
      const result = await compareSnapshots({
        baselinePath,
        currentPath: curPath,
        diffOutputPath: diffOut,
        threshold: threshold / 100,
      });
      result.name = snap.name;
      result.url = snap.url;
      results.push(result);

      await unlink(curPath).catch(() => {});

      if (result.error) {
        warning(`⚠ ${snap.name}: ${result.error}`);
      } else if (!result.passed) {
        warning(`❌ ${snap.name} 发现 ${result.diffPixels} 个像素差异 (${result.diffPercent}%)`);
      } else {
        notice(`✅ ${snap.name} 无变化`);
      }
    }

    const failedResults = results.filter((r) => !r.passed && !r.error);
    if (failedResults.length > 0) {
      info(generateReportSummary(results));
      setFailed(`${failedResults.length} 个页面视觉回归检测失败`);
    }
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    }
  }
}

run();
