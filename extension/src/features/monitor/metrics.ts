/**
 * Pure metric math (PLAN §6.4). CPU% comes from the delta between two
 * cumulative `os.cpus()` samples — no dependency on `systeminformation`.
 */

export interface CpuSample {
  idle: number;
  total: number;
}

export function cpuPercentFromSamples(prev: CpuSample, curr: CpuSample): number {
  const idleDelta = curr.idle - prev.idle;
  const totalDelta = curr.total - prev.total;
  if (totalDelta <= 0) return 0;
  return clampPercent(100 * (1 - idleDelta / totalDelta));
}

export function ramPercent(totalBytes: number, freeBytes: number): number {
  if (totalBytes <= 0) return 0;
  return clampPercent(100 * (1 - freeBytes / totalBytes));
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function formatGb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
