import { describe, it, expect } from "vitest";
import { generateTextReport, generateReportSummary, makePercentBar } from "../reporter.js";
import type { DiffResult } from "../types.js";

function makeResult(overrides: Partial<DiffResult>): DiffResult {
  return {
    name: "test",
    url: "http://example.com",
    diffPixels: 0,
    totalPixels: 1000000,
    diffPercent: 0,
    passed: true,
    ...overrides,
  };
}

describe("makePercentBar", () => {
  it("generates filled bar for 100%", () => {
    const bar = makePercentBar(100, 10);
    expect(bar).toBe("\u2588".repeat(10));
  });

  it("generates empty bar for 0%", () => {
    const bar = makePercentBar(0, 10);
    expect(bar).toBe("\u2591".repeat(10));
  });

  it("clamps at width", () => {
    const bar = makePercentBar(200, 5);
    expect(bar.length).toBe(5);
  });
});

describe("generateReportSummary", () => {
  it("shows info when no results", () => {
    const summary = generateReportSummary([]);
    expect(summary).toContain("????");
  });

  it("counts passed results", () => {
    const results = [
      makeResult({ name: "a", passed: true }),
      makeResult({ name: "b", passed: false, diffPercent: 1.5 }),
    ];
    const summary = generateReportSummary(results);
    expect(summary).toContain("1 ??");
    expect(summary).toContain("1 ??");
    expect(summary).toContain("b");
  });

  it("counts errored results", () => {
    const results = [
      makeResult({ name: "a", passed: false, error: "network error" }),
    ];
    const summary = generateReportSummary(results);
    expect(summary).toContain("1 ??");
  });
});

describe("generateTextReport", () => {
  it("handles passed result", () => {
    const text = generateTextReport({
      results: [makeResult({ name: "home", diffPercent: 0.01 })],
    });
    expect(text).toContain("home");
    expect(text).toContain("???");
  });

  it("shows diff details for failed result", () => {
    const text = generateTextReport({
      results: [makeResult({
        name: "pricing",
        passed: false,
        diffPercent: 2.5,
        diffPixels: 5000,
        diffImagePath: "/tmp/diff.png",
      })],
    });
    expect(text).toContain("pricing");
    expect(text).toContain("2.5%");
    expect(text).toContain("5000");
  });
});
