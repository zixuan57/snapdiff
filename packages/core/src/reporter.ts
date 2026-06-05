import { DiffResult } from "./types.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface ReportOptions {
  results: DiffResult[];
  verbose?: boolean;
}

export function generateTextReport(options: ReportOptions): string {
  const { results } = options;
  const lines: string[] = [];

  for (const result of results) {
    if (result.error) {
      lines.push(`\n  ⚠  ${result.error}`);
      continue;
    }

    if (result.passed) {
      lines.push(`  ✅ ${result.name} ── 无变化 (差异 ${result.diffPercent}%)`);
    } else {
      const bar = makePercentBar(result.diffPercent, 20);
      lines.push(`  ❌ ${result.name}`);
      lines.push(`     ${bar} ${result.diffPercent}% (${result.diffPixels} 像素)`);
      if (result.diffImagePath) {
        lines.push(`     📄 diff 图: ${result.diffImagePath}`);
      }
      lines.push(`     如果这是预期的变更, 请运行: npx snapdiff approve ${result.name}`);
    }
  }

  return lines.join("\n");
}

export function generateReportSummary(results: DiffResult[]): string {
  if (results.length === 0) {
    return "\n  ℹ 没有页面需要对比。";
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed && !r.error).length;
  const failed = results.filter((r) => !r.passed && !r.error).length;
  const errored = results.filter((r) => r.error).length;

  const summary = `\n  📊 摘要: ${total} 个页面, ${passed} 通过, ${failed} 失败, ${errored} 错误`;

  return summary + (failed > 0
    ? `\n  失败页面:\n${results.filter(r => !r.passed && !r.error).map(r => `    ❌ ${r.name} (${r.diffPercent}%)`).join("\n")}`
    : "");
}

export async function generateHtmlReport(
  results: DiffResult[],
  cwd: string
): Promise<string> {
  const reportDir = ".snapdiff/reports";
  const absReportDir = reportDir; // relative to cwd
  if (!existsSync(absReportDir)) {
    await mkdir(absReportDir, { recursive: true });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const reportPath = `${absReportDir}/report-${timestamp}.html`;

  // Edge case: no results
  if (results.length === 0) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>snapdiff 报告</title>
<style>body{font-family:-apple-system,sans-serif;background:#f5f5f5;padding:40px;text-align:center;color:#666;}
h1{font-size:24px;color:#333;}p{font-size:14px;margin-top:8px;}
</style></head>
<body><h1>无对比结果</h1><p>没有页面需要对比，请确认基线截图是否存在。</p></body></html>`;
    await writeFile(reportPath, html, "utf-8");
    return reportPath;
  }

  let cardsHtml = "";
  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    if (r.error) {
      cardsHtml += `<div class="card error"><h3>⚠ ${r.name}</h3><p>${r.error}</p></div>`;
      continue;
    }

    const status = r.passed ? "passed" : "failed";
    if (r.passed) passedCount++; else failedCount++;

    let diffImgHtml = "";
    if (r.diffImagePath && !r.passed) {
      try {
        const diffBuf = await readFile(r.diffImagePath);
        const b64 = diffBuf.toString("base64");
        diffImgHtml = `<img src="data:image/png;base64,${b64}" alt="diff" class="diff-img" />`;
      } catch {
        diffImgHtml = `<p class="dim">diff 图不可用</p>`;
      }
    }

    const bar = makePercentBar(r.diffPercent, 30);

    cardsHtml += `
<div class="card ${status}">
  <div class="card-header">
    <span class="status-badge ${status}">${r.passed ? "✅" : "❌"}</span>
    <span class="name">${r.name}</span>
    <span class="url">${r.url}</span>
  </div>
  <div class="card-body">
    <div class="stat-row">
      <span>差异比例</span>
      <span class="stat-value">${r.diffPercent}%</span>
    </div>
    <div class="stat-row">
      <span>差异像素</span>
      <span class="stat-value">${r.diffPixels.toLocaleString()} / ${r.totalPixels.toLocaleString()}</span>
    </div>
    <div class="bar-container">${bar}</div>
    ${diffImgHtml}
  </div>
</div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>snapdiff 视觉回归报告</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;color:#1a1a1a;padding:24px;}
.header{max-width:800px;margin:0 auto 24px;}
.header h1{font-size:24px;font-weight:600;}
.header .meta{color:#666;font-size:14px;margin-top:4px;}
.summary{display:flex;gap:16px;max-width:800px;margin:0 auto 24px;}
.summary-item{flex:1;background:white;border-radius:8px;padding:16px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.08);}
.summary-item .num{font-size:32px;font-weight:700;}
.summary-item .label{font-size:13px;color:#666;margin-top:4px;}
.summary-item.total .num{color:#333;}
.summary-item.passed .num{color:#22c55e;}
.summary-item.failed .num{color:#ef4444;}
.cards{max-width:800px;margin:0 auto;}
.card{background:white;border-radius:8px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;}
.card.passed{border-left:4px solid #22c55e;}
.card.failed{border-left:4px solid #ef4444;}
.card.error{border-left:4px solid #f59e0b;}
.card-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #f0f0f0;}
.status-badge{font-size:18px;}
.name{font-weight:600;font-size:15px;}
.url{color:#666;font-size:13px;margin-left:auto;}
.card-body{padding:16px;}
.stat-row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px;}
.stat-value{font-weight:600;}
.bar-container{margin:8px 0;font-family:"SF Mono","Fira Code",monospace;font-size:13px;color:#666;}
.diff-img{width:100%;max-width:600px;margin-top:12px;border:1px solid #e0e0e0;border-radius:4px;}
.dim{color:#999;font-size:13px;}
</style>
</head>
<body>
<div class="header">
  <h1>snapdiff 视觉回归报告</h1>
  <div class="meta">${new Date().toLocaleString("zh-CN")} · 共 ${results.length} 个页面</div>
</div>
<div class="summary">
  <div class="summary-item total"><div class="num">${results.length}</div><div class="label">总页面</div></div>
  <div class="summary-item passed"><div class="num">${passedCount}</div><div class="label">通过</div></div>
  <div class="summary-item failed"><div class="num">${failedCount}</div><div class="label">失败</div></div>
</div>
<div class="cards">${cardsHtml}</div>
</body>
</html>`;

  await writeFile(reportPath, html, "utf-8");
  return reportPath;
}

function makePercentBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const fillChar = "█";
  const emptyChar = "░";
  return fillChar.repeat(Math.min(filled, width)) + emptyChar.repeat(Math.max(empty, 0));
}
