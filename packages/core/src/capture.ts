import { chromium, type Browser } from "playwright";
import { SnapConfig, BaselineMeta } from "./types.js";

export interface CaptureOptions {
  config: SnapConfig;
  outputPath: string;
}

export interface CaptureResult {
  imagePath: string;
  meta: BaselineMeta;
  error?: string;
}

export async function captureSnapshot(
  options: CaptureOptions
): Promise<CaptureResult> {
  const { config, outputPath } = options;
  const viewport = config.viewport ?? { width: 1440, height: 900 };

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: config.headless ?? true });
    const page = await browser.newPage({ viewport });

    await page.goto(config.url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    if (config.selector) {
      await page.waitForSelector(config.selector, { timeout: 15_000 });
    }

    await page.waitForTimeout(500);

    const screenshotBuffer = await page.screenshot({ fullPage: config.fullPage ?? false, type: "png" });

    const { writeFile } = await import("node:fs/promises");
    await writeFile(outputPath, screenshotBuffer);

    const meta: BaselineMeta = {
      name: config.name,
      url: config.url,
      viewport,
      selector: config.selector,
      fullPage: config.fullPage,
      capturedAt: new Date().toISOString(),
      contentHash: simpleHash(screenshotBuffer),
    };

    return { imagePath: outputPath, meta };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("ENOTFOUND") || msg.includes("ERR_NAME_NOT_RESOLVED")) {
      throw new Error(`\u65e0\u6cd5\u8bbf\u95ee ${config.url}\uff0c\u8bf7\u68c0\u67e5\u9875\u9762\u662f\u5426\u5df2\u542f\u52a8\u6216 URL \u662f\u5426\u6b63\u786e`);
    }
    if (msg.includes("ERR_CONNECTION_TIMEOUT") || msg.includes("ERR_TIMED_OUT") || msg.includes("timeout")) {
      throw new Error(`\u8bbf\u95ee ${config.url} \u8d85\u65f6\uff0830 \u79d2\uff09\uff0c\u9875\u9762\u53ef\u80fd\u52a0\u8f7d\u8fc7\u6162`);
    }
    if (msg.includes("ERR_ABORTED")) {
      throw new Error(`\u5bf9 ${config.url} \u7684\u8bf7\u6c42\u88ab\u4e2d\u65ad\uff0c\u8bf7\u68c0\u67e5\u9875\u9762\u662f\u5426\u88ab\u91cd\u5b9a\u5411\u6216\u62e6\u622a`);
    }
    if (msg.includes("waitForSelector") || (msg.includes("Timeout") && config.selector)) {
      throw new Error(`\u7b49\u5f85\u9009\u62e9\u5668 "${config.selector}" \u8d85\u65f6\uff0c\u8be5\u5143\u7d20\u5728\u9875\u9762\u4e2d\u672a\u627e\u5230`);
    }
    if (msg.includes("spawn EACCES") || msg.includes("spawn EPERM") || msg.includes("spawn ENOTDIR")) {
      throw new Error(`\u6d4f\u89c8\u5668\u8fdb\u7a0b\u542f\u52a8\u5931\u8d25\uff08\u6743\u9650\u4e0d\u8db3\uff09\uff0c\u8bf7\u91cd\u65b0\u5b89\u88c5 Chromium:\n  npx playwright install chromium`);
    }
    throw new Error(`\u622a\u56fe\u5931\u8d25: ${msg}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export async function captureSnapshotsParallel(
  snaps: Array<{ config: SnapConfig; outputPath: string }>,
  concurrency: number = 3
): Promise<CaptureResult[]> {
  const results: CaptureResult[] = new Array(snaps.length);
  const queue = snaps.map((snap, index) => ({ ...snap, index }));

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        const result = await captureSnapshot(item);
        results[item.index] = result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  \u2717 ${item.config.name}: ${msg}`);
        results[item.index] = {
          imagePath: "",
          meta: {
            name: item.config.name,
            url: item.config.url,
            viewport: item.config.viewport ?? { width: 1440, height: 900 },
            capturedAt: "",
            contentHash: "",
          },
          error: msg,
        };
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
