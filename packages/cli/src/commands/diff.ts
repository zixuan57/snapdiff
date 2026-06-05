import { join } from "node:path";
import { unlink, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import pc from "picocolors";
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
  makePercentBar,
} from "@snapdiff/core";

const TEMP_DIR = ".snapdiff/tmp";

function tempImagePath(cwd: string, name: string): string {
  return join(cwd, TEMP_DIR, `current-${name}.png`);
}

async function cleanupOldFiles(cwd: string) {
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const subDir of ["diffs", "reports"]) {
    const dir = join(cwd, ".snapdiff", subDir);
    if (!existsSync(dir)) continue;
    try {
      const files = await readdir(dir);
      for (const file of files) {
        const filePath = join(dir, file);
        try {
          const stat = await import("node:fs/promises").then(m => m.stat(filePath));
          if (now - stat.mtimeMs > maxAge) {
            await unlink(filePath);
          }
        } catch {}
      }
    } catch {}
  }
}

export async function diffCommand(
  url: string | undefined,
  options: { name?: string; threshold?: string }
) {
  const cwd = process.cwd();
  await ensureDirs(cwd);
  const threshold = parseFloat(options.threshold || "0.1");

  // No args -> run all snaps from config (parallel capture)
  if (!url && !options.name) {
    const config = await loadConfig(cwd);
    if (!config || config.snaps.length === 0) {
      console.log(pc.yellow("\u26a0 \u672a\u627e\u5230\u914d\u7f6e\uff0c\u8bf7\u5148\u8fd0\u884c snapdiff init \u6216\u63d0\u4f9b\u53c2\u6570"));
      console.log(`  ${pc.bold("npx snapdiff diff <url> --name <name>")}`);
      return;
    }

    // Check which snaps have baselines
    const validSnaps = [];
    for (const snap of config.snaps) {
      if (await baselineExists(cwd, snap.name)) {
        validSnaps.push(snap);
      } else {
        console.log(pc.yellow(`\n  \u26a0 "${snap.name}" \u8fd8\u6ca1\u6709\u57fa\u7ebf\u622a\u56fe\u3002`));
        console.log(`     ${pc.bold("npx snapdiff capture " + snap.url + " --name " + snap.name)}`);
      }
    }

    if (validSnaps.length === 0) {
      console.log(pc.dim("\n  \u6ca1\u6709\u9700\u8981\u5bf9\u6bd4\u7684\u9875\u9762\u3002"));
      return;
    }

    await cleanupOldFiles(cwd);

    console.log(pc.cyan(`\n  \u6b63\u5728\u5e76\u884c\u622a\u53d6 ${validSnaps.length} \u4e2a\u9875\u9762...`));
    const timestamp = String(Math.floor(Date.now() / 1000));

    // Phase 1: capture all current states in parallel (to tmp dir)
    const captureTasks = validSnaps.map((snap) => ({
      config: {
        ...snap,
        viewport: snap.viewport ?? { width: 1440, height: 900 },
        threshold: snap.threshold ?? 0.1,
      },
      outputPath: tempImagePath(cwd, snap.name),
    }));

    const captureResults = await captureSnapshotsParallel(captureTasks, 3);

    // Phase 2: compare all diffs
    const results = [];
    const currentPaths: Record<string, string> = {};
    for (let i = 0; i < validSnaps.length; i++) {
      const snap = validSnaps[i];
      const captureResult = captureResults[i];
      if (captureResult.error) {
        results.push({
          name: snap.name,
          url: snap.url,
          diffPixels: 0,
          totalPixels: 0,
          diffPercent: 0,
          error: '\u622a\u56fe\u5931\u8d25: ' + captureResult.error,
          passed: false,
        });
        console.log('  \u26a0 ' + snap.name + ': \u622a\u56fe\u5931\u8d25 - ' + captureResult.error);
        continue;
      }
      const currentPath = captureResult.imagePath;
      currentPaths[snap.name] = currentPath;

      const diffOut = diffImagePath(cwd, snap.name, timestamp);
      const result = await compareSnapshots({
        baselinePath: baselineImagePath(cwd, snap.name),
        currentPath,
        diffOutputPath: diffOut,
        threshold: threshold / 100,
        maskRegions: snap.maskRegions,
      });
      result.name = snap.name;
      result.url = snap.url;
      results.push(result);

      if (result.error) {
        console.log("  \u26a0 " + snap.name + ": " + result.error);
      } else if (result.passed) {
        console.log(pc.green("  \u2705 " + snap.name + " \u2014\u2014 \u65e0\u53d8\u5316 (\u5dee\u5f02 " + result.diffPercent + "%)"));
      } else {
        const bar = makePercentBar(result.diffPercent, 20);
        console.log("  \u274c " + snap.name);
        console.log("     " + bar + " " + result.diffPercent + "% (" + result.diffPixels + " \u50cf\u7d20)");
        console.log(pc.dim("     \ud83d\udcc4 diff \u56fe: " + result.diffImagePath));
        console.log(pc.cyan("     \u5982\u679c\u8fd9\u662f\u9884\u671f\u7684\u53d8\u66f4: " + pc.bold("npx snapdiff approve " + snap.name)));
      }
    }

    // Generate report BEFORE cleanup (so current images are available)
    if (results.length > 0) {
      console.log(generateReportSummary(results));
      const htmlPath = await generateHtmlReport(results, cwd, { currentPaths });
      console.log(pc.cyan("\n  \ud83d\udcca HTML \u62a5\u544a: " + htmlPath));
    }

    // Cleanup temp current images
    for (const path of Object.values(currentPaths)) {
      await unlink(path).catch(() => {});
    }
    return;
  }

  // Single URL mode
  if (!url || !options.name) {
    console.log(pc.yellow("\u8bf7\u63d0\u4f9b URL \u548c\u540d\u79f0\uff1a"));
    console.log("  " + pc.bold("npx snapdiff diff <url> --name <name>"));
    return;
  }

  const name = options.name;
  if (!(await baselineExists(cwd, name))) {
    console.log(pc.yellow('\n  \u26a0 "' + name + '" \u8fd8\u6ca1\u6709\u57fa\u7ebf\u622a\u56fe\u3002'));
    console.log("  \u8bf7\u5148\u8fd0\u884c: " + pc.bold("npx snapdiff capture " + url + " --name " + name));
    return;
  }

  await cleanupOldFiles(cwd);

  console.log(pc.cyan("\u6b63\u5728\u5bf9\u6bd4 " + name + "..."));
  const viewport = { width: 1440, height: 900 };
  const t = String(Math.floor(Date.now() / 1000));
  const currentPath = tempImagePath(cwd, name);

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
        maskRegions: undefined,
  });
  result.name = name;
  result.url = url;

  // Generate report before cleanup
  const htmlPath = await generateHtmlReport([result], cwd, { currentPaths: { [name]: curPath } });

  // Cleanup temp
  await unlink(curPath).catch(() => {});

  if (result.error) {
    console.log("  \u26a0 " + result.error);
  } else if (result.passed) {
    console.log(pc.green("  \u2705 \u65e0\u53d8\u5316 (\u5dee\u5f02 " + result.diffPercent + "%)"));
  } else {
    const bar = makePercentBar(result.diffPercent, 20);
    console.log("  \u274c " + name);
    console.log("     " + bar + " " + result.diffPercent + "% (" + result.diffPixels + " \u50cf\u7d20)");
    console.log(pc.dim("     \ud83d\udcc4 diff \u56fe: " + result.diffImagePath));
    console.log(pc.cyan("  \u5982\u679c\u8fd9\u662f\u9884\u671f\u7684\u53d8\u66f4: " + pc.bold("npx snapdiff approve " + name)));
  }

  console.log(pc.cyan("\n  \ud83d\udcca HTML \u62a5\u544a: " + htmlPath));
}
