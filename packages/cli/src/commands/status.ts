import pc from "picocolors";
import { listBaselines, loadConfig } from "../core/index.js";

export async function statusCommand() {
  const cwd = process.cwd();
  const baselines = await listBaselines(cwd);
  const config = await loadConfig(cwd);

  console.log(pc.cyan("\n  📸 snapdiff 基线状态\n"));

  if (baselines.length === 0 && (!config || config.snaps.length === 0)) {
    console.log("  还没有任何基线截图。");
    console.log(`  请先运行: ${pc.bold("npx snapdiff init")}`);
    console.log(`  或: ${pc.bold("npx snapdiff capture <url> --name <name>")}`);
    console.log();
    return;
  }

  // Build a set of configured snap names
  const configuredSnaps = new Set(config?.snaps.map((s) => s.name) ?? []);

  // Header
  const header = `  ${"名称".padEnd(22)} ${"URL".padEnd(40)} ${"基线时间".padEnd(22)} 状态`;
  console.log(pc.dim(header));
  console.log(pc.dim("  " + "─".repeat(90)));

  // Show configured snaps first
  if (config) {
    for (const snap of config.snaps) {
      const baseline = baselines.find((b) => b.name === snap.name);
      const timeStr = baseline?.meta
        ? new Date(baseline.meta.capturedAt).toLocaleString("zh-CN")
        : "—";
      const status = baseline
        ? pc.green("✅ 正常")
        : pc.yellow("⚠ 未截取");
      console.log(
        `  ${snap.name.padEnd(22)} ${snap.url.padEnd(40)} ${timeStr.padEnd(22)} ${status}`
      );
    }
  }

  // Show uncatalogued baselines
  const uncatalogued = baselines.filter((b) => !configuredSnaps.has(b.name));
  if (uncatalogued.length > 0) {
    console.log();
    console.log(pc.dim("  未纳入配置的基线："));
    for (const b of uncatalogued) {
      const timeStr = b.meta
        ? new Date(b.meta.capturedAt).toLocaleString("zh-CN")
        : "—";
      console.log(`    ${b.name.padEnd(22)} ${timeStr.padEnd(22)} ${pc.dim("(无对应配置)")}`);
    }
  }

  console.log();
  console.log(pc.dim("  提示: 修改代码后运行 npx snapdiff diff 进行对比"));
  console.log();
}

