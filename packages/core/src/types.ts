export interface SnapConfig {
  name: string;
  url: string;
  selector?: string;
  viewport?: { width: number; height: number };
  threshold?: number; // 0-100, default 0.1
  maskRegions?: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface BaselineMeta {
  name: string;
  url: string;
  viewport: { width: number; height: number };
  selector?: string;
  capturedAt: string;
  contentHash: string;
}

export interface DiffResult {
  name: string;
  url: string;
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
  passed: boolean;
  diffImagePath?: string;
  error?: string;
}
