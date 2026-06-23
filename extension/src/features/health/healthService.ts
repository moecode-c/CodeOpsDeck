import type { HealthCheckDef } from '../../core/projectConfig';
import { classifyHealth, type HealthResult } from './health';

/** Polls health endpoints with the built-in `fetch` (PLAN §6.3) — zero deps. */
export class HealthService {
  constructor(private readonly timeoutMs = 5000) {}

  checkAll(checks: HealthCheckDef[]): Promise<HealthResult[]> {
    return Promise.all(checks.map((check) => this.checkOne(check)));
  }

  async checkOne(check: HealthCheckDef): Promise<HealthResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(check.url, { signal: controller.signal, redirect: 'manual' });
      return {
        name: check.name,
        url: check.url,
        up: classifyHealth(response.status),
        status: response.status,
        latencyMs: Date.now() - start,
        checkedAt: Date.now(),
      };
    } catch (err) {
      return {
        name: check.name,
        url: check.url,
        up: false,
        status: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
        checkedAt: Date.now(),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
