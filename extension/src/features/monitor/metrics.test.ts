import { describe, it, expect } from 'vitest';
import { clampPercent, cpuPercentFromSamples, formatGb, ramPercent } from './metrics';

describe('cpuPercentFromSamples', () => {
  it('computes busy percentage from idle/total deltas', () => {
    // total +1000, idle +250 → 75% busy
    const cpu = cpuPercentFromSamples({ idle: 1000, total: 4000 }, { idle: 1250, total: 5000 });
    expect(cpu).toBeCloseTo(75);
  });

  it('returns 0 when no time has elapsed', () => {
    expect(cpuPercentFromSamples({ idle: 10, total: 20 }, { idle: 10, total: 20 })).toBe(0);
  });
});

describe('ramPercent', () => {
  it('computes used percentage', () => {
    expect(ramPercent(1000, 250)).toBeCloseTo(75);
  });
  it('guards against a zero total', () => {
    expect(ramPercent(0, 0)).toBe(0);
  });
});

describe('clampPercent', () => {
  it('clamps to the 0–100 range', () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(42)).toBe(42);
  });
});

describe('formatGb', () => {
  it('formats bytes as gigabytes', () => {
    expect(formatGb(2 * 1024 ** 3)).toBe('2.0 GB');
  });
});
