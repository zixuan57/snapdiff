import { DiffResult } from "./types.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { baselineImagePath } from "./storage.js";

export interface ReportOptions {
  results: DiffResult[];
  verbose?: boolean;
}

export function generateTextReport(options: ReportOptions): string {
  const { results } = options;
  const lines: string[] = [];

  for (const result of results) {
    if (result.error) {
      lines.push(`\n  ?  ${result.error}`);
      continue;
    }

    if (result.passed) {
      lines.push(`  ? ${result.name} ?? ??? (?? ${result.diffPercent}%)`);
    } else {
      const bar = makePercentBar(result.diffPercent, 20);
      lines.push(`  ? ${result.name}`);
      lines.push(`     ${bar} ${result.diffPercent}% (${result.diffPixels} ??)`);
      if (result.diffImagePath) {
        lines.push(`     ?? diff ?: ${result.diffImagePath}`);
      }
      lines.push(`     ?????????, ???: npx snapdiff approve ${result.name}`);
    }
  }

  return lines.join("\n");
}

export function generateReportSummary(results: DiffResult[]): string {
  if (results.length === 0) {
    return "\n  ? ?????????";
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed && !r.error).length;
  const failed = results.filter((r) => !r.passed && !r.error).length;
  const errored = results.filter((r) => r.error).length;

  const summary = `\n  ?? ??: ${total} ???, ${passed} ??, ${failed} ??, ${errored} ??`;

  return summary + (failed > 0
    ? `\n  ????:\n${results.filter(r => !r.passed && !r.error).map(r => `    ? ${r.name} (${r.diffPercent}%)`).join("\n")}`
    : "");
}

export async function generateHtmlReport(
  results: DiffResult[],
  cwd: string,
  extra?: { currentPaths?: Record<string, string> }
): Promise<string> {
  const reportDir = ".snapdiff/reports";
  if (!existsSync(reportDir)) {
    await mkdir(reportDir, { recursive: true });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const reportPath = `${reportDir}/report-${timestamp}.html`;

  // Edge case: no results
  if (results.length === 0) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>snapdiff ??</title>
<style>body{font-family:-apple-system,sans-serif;background:#f5f5f5;padding:40px;text-align:center;color:#666;}
h1{font-size:24px;color:#333;}p{font-size:14px;margin-top:8px;}
</style></head>
<body><h1>?????</h1><p>?????????????????????</p></body></html>`;
    await writeFile(reportPath, html, "utf-8");
    return reportPath;
  }

  let cardsHtml = "";
  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    if (r.error) {
      cardsHtml += `<div class="card error"><h3>? ${r.name}</h3><p>${r.error}</p></div>`;
      continue;
    }

    const status = r.passed ? "passed" : "failed";
    if (r.passed) passedCount++; else failedCount++;

    // Read baseline image
    let baselineImgHtml = "";
    const blPath = baselineImagePath(cwd, r.name);
    if (existsSync(blPath)) {
      try {
        const buf = await readFile(blPath);
        const b64 = buf.toString("base64");
        baselineImgHtml = `<img src="data:image/png;base64,${b64}" alt="baseline" class="snap-img" />`;
      } catch {}
    }

    // Read current image (from temp path if provided)
    let currentImgHtml = "";
    const curPath = extra?.currentPaths?.[r.name];
    if (curPath && existsSync(curPath)) {
      try {
        const buf = await readFile(curPath);
        const b64 = buf.toString("base64");
        currentImgHtml = `<img src="data:image/png;base64,${b64}" alt="current" class="snap-img" />`;
      } catch {}
    }

    // Read diff image
    let diffImgHtml = "";
    if (r.diffImagePath && existsSync(r.diffImagePath)) {
      try {
        const diffBuf = await readFile(r.diffImagePath);
        const b64 = diffBuf.toString("base64");
        diffImgHtml = `<img src="data:image/png;base64,${b64}" alt="diff" class="snap-img" />`;
      } catch {
        diffImgHtml = `<p class="dim">diff ????</p>`;
      }
    }

    const bar = makePercentBar(r.diffPercent, 30);

    // Only show comparison images if there are diffs to see
    const comparisonImages = (!r.passed && baselineImgHtml && currentImgHtml) ? `
<div class="comparison">
  <div class="comparison-col">
    <div class="comparison-label">??</div>
    ${baselineImgHtml}
  </div>
  <div class="comparison-col">
    <div class="comparison-label">??</div>
    ${currentImgHtml}
  </div>
  <div class="comparison-col">
    <div class="comparison-label">??</div>
    ${diffImgHtml}
  </div>
</div>` : (diffImgHtml ? `<div class="comparison"><div class="comparison-col"><div class="comparison-label">??</div>${diffImgHtml}</div></div>` : "");

    cardsHtml += `
<div class="card ${status}">
  <div class="card-header">
    <span class="status-badge ${status}">${r.passed ? "?" : "?"}</span>
    <span class="name">${r.name}</span>
    <span class="url">${r.url}</span>
  </div>
  <div class="card-body">
    <div class="stat-row">
      <span>????</span>
      <span class="stat-value">${r.diffPercent}%</span>
    </div>
    <div class="stat-row">
      <span>????</span>
      <span class="stat-value">${r.diffPixels.toLocaleString()} / ${r.totalPixels.toLocaleString()}</span>
    </div>
    <div class="bar-container">${bar}</div>
    ${comparisonImages}
  </div>
</div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>snapdiff ??????</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;color:#1a1a1a;padding:24px;}
.header{max-width:1000px;margin:0 auto 24px;}
.header h1{font-size:24px;font-weight:600;}
.header .meta{color:#666;font-size:14px;margin-top:4px;}
.summary{display:flex;gap:16px;max-width:1000px;margin:0 auto 24px;}
.summary-item{flex:1;background:white;border-radius:8px;padding:16px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.08);}
.summary-item .num{font-size:32px;font-weight:700;}
.summary-item .label{font-size:13px;color:#666;margin-top:4px;}
.summary-item.total .num{color:#333;}
.summary-item.passed .num{color:#22c55e;}
.summary-item.failed .num{color:#ef4444;}
.cards{max-width:1000px;margin:0 auto;}
.card{background:white;border-radius:8px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;}
.card.passed{border-left:4px solid #22c55e;}
.card.failed{border-left:4px solid #ef4444;}
.card.error{border-left:4px solid #f59e0b;}
.card-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #f0f0f0;}
.status-badge{font-size:18px;}
.name{font-weight:600;font-size:15px;}
.url{color:#666;font-size:13px;margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;}
.card-body{padding:16px;}
.stat-row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px;}
.stat-value{font-weight:600;}
.bar-container{margin:8px 0;font-family:"SF Mono","Fira Code",monospace;font-size:13px;color:#666;}
.comparison{display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;}
.comparison-col{flex:1;min-width:200px;}
.comparison-label{font-size:12px;color:#666;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}
.snap-img{width:100%;border:1px solid #e0e0e0;border-radius:4px;display:block;}
.dim{color:#999;font-size:13px;}
</style>
</head>
<body>
<div class="header">
  <h1>snapdiff ??????</h1>
  <div class="meta">${new Date().toLocaleString("zh-CN")} ? ? ${results.length} ???</div>
</div>
<div class="summary">
  <div class="summary-item total"><div class="num">${results.length}</div><div class="label">???</div></div>
  <div class="summary-item passed"><div class="num">${passedCount}</div><div class="label">??</div></div>
  <div class="summary-item failed"><div class="num">${failedCount}</div><div class="label">??</div></div>
</div>
<div class="cards">${cardsHtml}</div>
</body>
</html>`;

  await writeFile(reportPath, html, "utf-8");
  return reportPath;
}

export function makePercentBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const fillChar = "\u2588";
  const emptyChar = "\u2591";
  return fillChar.repeat(Math.min(filled, width)) + emptyChar.repeat(Math.max(empty, 0));
}
