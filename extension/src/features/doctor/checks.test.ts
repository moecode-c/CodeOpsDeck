import { describe, it, expect } from 'vitest';
import { compareVersions, diffEnvKeys, meetsMinVersion, parseVersionOutput, summarize } from './checks';
import type { CheckGroup } from './types';

describe('parseVersionOutput', () => {
  it.each([
    ['v18.17.0', '18.17.0'],
    ['Docker version 24.0.5, build 1234', '24.0.5'],
    ['git version 2.43.0.windows.1', '2.43.0'],
    ['npm 10.2', '10.2'],
  ])('parses %s', (raw, expected) => {
    expect(parseVersionOutput(raw)).toBe(expected);
  });

  it('returns undefined when no version is present', () => {
    expect(parseVersionOutput('command not found')).toBeUndefined();
  });
});

describe('compareVersions', () => {
  it('orders versions segment-wise', () => {
    expect(compareVersions('18.0.0', '18.0.0')).toBe(0);
    expect(compareVersions('17.9.0', '18.0.0')).toBe(-1);
    expect(compareVersions('20.1.0', '18.0.0')).toBe(1);
    expect(compareVersions('18.1', '18.0.5')).toBe(1);
  });
});

describe('meetsMinVersion', () => {
  it('fails when the tool is missing', () => {
    expect(meetsMinVersion(undefined, '18.0.0')).toBe('fail');
  });
  it('is ok when there is no minimum', () => {
    expect(meetsMinVersion('1.0.0')).toBe('ok');
  });
  it('warns when below the minimum', () => {
    expect(meetsMinVersion('16.0.0', '18.0.0')).toBe('warn');
  });
  it('is ok when at or above the minimum', () => {
    expect(meetsMinVersion('18.0.0', '18.0.0')).toBe('ok');
    expect(meetsMinVersion('20.0.0', '18.0.0')).toBe('ok');
  });
});

describe('diffEnvKeys', () => {
  it('returns required keys that are not present', () => {
    expect(diffEnvKeys(['A', 'B', 'C'], ['B'])).toEqual(['A', 'C']);
  });
  it('returns nothing when all present', () => {
    expect(diffEnvKeys(['A'], ['A', 'B'])).toEqual([]);
  });
});

describe('summarize', () => {
  it('counts statuses across groups', () => {
    const groups: CheckGroup[] = [
      { id: 'tools', label: 'Tools', items: [
        { id: '1', label: 'a', status: 'ok' },
        { id: '2', label: 'b', status: 'fail' },
      ] },
      { id: 'svc', label: 'Services', items: [{ id: '3', label: 'c', status: 'warn' }] },
    ];
    expect(summarize(groups)).toEqual({ ok: 1, warn: 1, fail: 1 });
  });
});
