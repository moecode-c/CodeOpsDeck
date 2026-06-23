import type { CheckGroup, CheckStatus, DoctorReport } from './types';

/** Pure check helpers — no `vscode`, no I/O, so they are unit-testable. */

/** Pull the first `x.y[.z]` version token out of a `--version` output line. */
export function parseVersionOutput(raw: string): string | undefined {
  return raw.match(/\d+\.\d+(?:\.\d+)?/)?.[0];
}

/** Numeric, segment-wise version compare. Returns -1, 0 or 1. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/** Map an actual version against a minimum into a check status. */
export function meetsMinVersion(actual: string | undefined, min?: string): CheckStatus {
  if (!actual) return 'fail';
  if (!min) return 'ok';
  return compareVersions(actual, min) >= 0 ? 'ok' : 'warn';
}

/** Required keys that are absent from the present set. */
export function diffEnvKeys(required: string[], present: string[]): string[] {
  const have = new Set(present);
  return required.filter((key) => !have.has(key));
}

/** Roll up status counts across all groups. */
export function summarize(groups: CheckGroup[]): DoctorReport['summary'] {
  const summary = { ok: 0, warn: 0, fail: 0 };
  for (const group of groups) {
    for (const item of group.items) summary[item.status]++;
  }
  return summary;
}
