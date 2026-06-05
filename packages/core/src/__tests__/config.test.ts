import { describe, it, expect } from "vitest";
import { loadConfig, defaultConfig } from "../config.js";
import { join } from "node:path";
import { writeFile, unlink, mkdir } from "node:fs/promises";

describe("config loading", () => {
  it("defaultConfig returns empty snaps", () => {
    const cfg = defaultConfig();
    expect(cfg.snaps).toEqual([]);
  });

  it("loadConfig reads snapdiff.config.json", async () => {
    const configData = {
      snaps: [
        { name: "test", url: "http://example.com", viewport: { width: 1440, height: 900 }, threshold: 0.1 }
      ]
    };
    const configDir = join(process.cwd(), ".test-config-" + Date.now() + Math.random());
    await mkdir(configDir, { recursive: true });
    try {
      await writeFile(join(configDir, "snapdiff.config.json"), JSON.stringify(configData), "utf-8");
      const cfg = await loadConfig(configDir);
      expect(cfg).not.toBeNull();
      expect(cfg!.snaps).toHaveLength(1);
      expect(cfg!.snaps[0].name).toBe("test");
    } finally {
      await unlink(join(configDir, "snapdiff.config.json")).catch(() => {});
      await unlink(configDir).catch(() => {});
    }
  });

  it("loadConfig returns null for empty directory", async () => {
    const emptyDir = join(process.cwd(), ".test-empty-" + Date.now() + Math.random());
    await mkdir(emptyDir, { recursive: true });
    try {
      const cfg = await loadConfig(emptyDir);
      expect(cfg).toBeNull();
    } finally {
      await unlink(emptyDir).catch(() => {});
    }
  });
});
