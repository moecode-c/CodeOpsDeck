/** Pure health-check helpers (PLAN §6.3) — no I/O, so they are unit-testable. */

export interface HealthResult {
  name: string;
  url: string;
  up: boolean;
  status: number; // HTTP status, or 0 on a network/timeout error
  latencyMs: number;
  error?: string;
  checkedAt: number;
}

/** A response counts as "up" for any non-error status (< 400). */
export function classifyHealth(status: number): boolean {
  return status > 0 && status < 400;
}

export function summarizeHealth(results: { up: boolean }[]): { healthy: number; total: number } {
  return { healthy: results.filter((r) => r.up).length, total: results.length };
}

/** Tracks up/down state per check and reports only the transitions on each update. */
export class TransitionTracker {
  private readonly previous = new Map<string, boolean>();

  update(results: { name: string; up: boolean }[]): { name: string; up: boolean }[] {
    const transitions: { name: string; up: boolean }[] = [];
    for (const result of results) {
      const was = this.previous.get(result.name);
      if (was !== undefined && was !== result.up) {
        transitions.push({ name: result.name, up: result.up });
      }
      this.previous.set(result.name, result.up);
    }
    return transitions;
  }
}
