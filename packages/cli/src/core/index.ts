export type { SnapConfig, BaselineMeta, DiffResult } from "./types.js";
export type { ProjectConfig } from "./config.js";
export { loadConfig, defaultConfig } from "./config.js";
export { captureSnapshot, captureSnapshotsParallel, type CaptureOptions, type CaptureResult } from "./capture.js";
export { compareSnapshots, type DiffOptions } from "./diff.js";
export {
  ensureDirs,
  baselineImagePath,
  baselineMetaPath,
  diffImagePath,
  saveBaselineMeta,
  loadBaselineMeta,
  baselineExists,
  listBaselines,
} from "./storage.js";
export { generateTextReport, generateReportSummary, generateHtmlReport } from "./reporter.js";
