import { describe, it, expect } from 'vitest';
import { calcCpuPercent, calcMemoryUsedBytes, formatMb, type DockerStatsSample } from './stats';

describe('calcCpuPercent', () => {
  it('computes percentage from cpu/system deltas across online CPUs', () => {
    const sample: DockerStatsSample = {
      cpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 2000, online_cpus: 4 },
      precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
    };
    // cpuDelta=100, systemDelta=1000 → 0.1 * 4 * 100 = 40%
    expect(calcCpuPercent(sample)).toBeCloseTo(40);
  });

  it('returns 0 when there is no movement', () => {
    const sample: DockerStatsSample = {
      cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000, online_cpus: 2 },
      precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
    };
    expect(calcCpuPercent(sample)).toBe(0);
  });

  it('falls back to percpu length when online_cpus is absent', () => {
    const sample: DockerStatsSample = {
      cpu_stats: { cpu_usage: { total_usage: 200, percpu_usage: [1, 2] }, system_cpu_usage: 2000 },
      precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
    };
    expect(calcCpuPercent(sample)).toBeCloseTo(20);
  });
});

describe('calcMemoryUsedBytes', () => {
  it('subtracts cache from usage', () => {
    expect(calcMemoryUsedBytes({ memory_stats: { usage: 100, stats: { cache: 30 } } })).toBe(70);
  });
  it('subtracts inactive_file when cache is absent (cgroup v2)', () => {
    expect(calcMemoryUsedBytes({ memory_stats: { usage: 100, stats: { inactive_file: 25 } } })).toBe(75);
  });
  it('never goes negative', () => {
    expect(calcMemoryUsedBytes({ memory_stats: { usage: 10, stats: { cache: 50 } } })).toBe(0);
  });
});

describe('formatMb', () => {
  it('formats bytes as whole megabytes', () => {
    expect(formatMb(10 * 1024 * 1024)).toBe('10 MB');
  });
});
