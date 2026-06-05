import { chromium, type Browser } from "playwright";
import { SnapConfig, BaselineMeta } from "./types.js";

export interface CaptureOptions {
  config: SnapConfig;
  outputPath: string;
}

export interface CaptureResult {
  imagePath: string;
  meta: BaselineMeta;
}

function prefixLines(msg: string): string {
  return msg.replace(/^/gm, "  ");
}

export async function captureSnapshot(
  options: CaptureOptions
): Promise<CaptureResult> {
  const { config, outputPath } = options;
  const viewport = config.viewport ?? { width: 1440, height: 900 };

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport });

    await page.goto(config.url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    if (config.selector) {
      await page.waitForSelector(config.selector, { timeout: 15_000 });
    }

    await page.waitForTimeout(500);

    const screenshotBuffer = await page.screenshot({ fullPage: false, type: "png" });

    const { writeFile } = await import("node:fs/promises");
    await writeFile(outputPath, screenshotBuffer);

    const meta: BaselineMeta = {
      name: config.name,
      url: config.url,
      viewport,
      selector: config.selector,
      capturedAt: new Date().toISOString(),
      contentHash: simpleHash(screenshotBuffer),
    };

    return { imagePath: outputPath, meta };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("ENOTFOUND") || msg.includes("ERR_NAME_NOT_RESOLVED")) {
      throw new Error(`无法访问 ${config.url}，请检查页面是否已启动或 URL 是否正确`);
    }
    if (msg.includes("ERR_CONNECTION_TIMEOUT") || msg.includes("ERR_TIMED_OUT") || msg.includes("timeout")) {
      throw new Error(`访问 ${config.url} 超时（30 秒），页面可能加载过慢`);
    }
    if (msg.includes("ERR_ABORTED")) {
      throw new Error(`对 ${config.url} 的请求被中断，请检查页面是否被重定向或拦截`);
    }
    if (msg.includes("waitForSelector") || (msg.includes("Timeout") && config.selector)) {
      throw new Error(`等待选择器 "${config.selector}" 超时，该元素在页面中未找到`);
    }
    if (msg.includes("spawn EACCES") || msg.includes("spawn EPERM") || msg.includes("spawn ENOTDIR")) {
      throw new Error(`浏览器进程启动失败（权限不足），请重新安装 Chromium:\n  npx playwright install chromium`);
    }
    throw new Error(`截图失败: ${msg}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export async function captureSnapshotsParallel(
  snaps: Array<{ config: SnapConfig; outputPath: string }>,
  concurrency: number = 3
): Promise<CaptureResult[]> {
  const results: CaptureResult[] = [];
  const queue = [...snaps];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        const result = await captureSnapshot(item);
        results.push(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${item.config.name}: ${msg}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, snaps.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

function simpleHash(buffer: Buffer): string {
  let hash = 0;
  for (let i = 0; i < buffer.length; i += 1000) {
    hash = ((hash << 5) - hash + buffer[i]) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
