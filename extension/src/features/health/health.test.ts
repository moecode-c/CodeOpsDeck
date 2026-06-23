import { describe, it, expect } from 'vitest';
import { classifyHealth, summarizeHealth, TransitionTracker } from './health';

describe('classifyHealth', () => {
  it.each([
    [200, true],
    [204, true],
    [301, true],
    [399, true],
    [400, false],
    [404, false],
    [500, false],
    [0, false],
  ])('status %i → up=%s', (status, up) => {
    expect(classifyHealth(status)).toBe(up);
  });
});

describe('summarizeHealth', () => {
  it('counts healthy out of total', () => {
    expect(summarizeHealth([{ up: true }, { up: false }, { up: true }])).toEqual({ healthy: 2, total: 3 });
  });
});

describe('TransitionTracker', () => {
  it('reports nothing on first sight, then only on changes', () => {
    const tracker = new TransitionTracker();
    expect(tracker.update([{ name: 'api', up: true }])).toEqual([]);
    expect(tracker.update([{ name: 'api', up: true }])).toEqual([]);
    expect(tracker.update([{ name: 'api', up: false }])).toEqual([{ name: 'api', up: false }]);
    expect(tracker.update([{ name: 'api', up: true }])).toEqual([{ name: 'api', up: true }]);
  });
});
