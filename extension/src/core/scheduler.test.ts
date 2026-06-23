import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from './scheduler';

describe('Scheduler', () => {
  it('runs a task immediately, then once per interval', () => {
    let now = 1000;
    const scheduler = new Scheduler({ now: () => now });
    const run = vi.fn();
    scheduler.register('a', 1000, run);

    scheduler.tick(); // first tick → due
    expect(run).toHaveBeenCalledTimes(1);

    now = 1500;
    scheduler.tick(); // 500ms < 1000ms → not due
    expect(run).toHaveBeenCalledTimes(1);

    now = 2000;
    scheduler.tick(); // 1000ms elapsed → due
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('stretches intervals by the backoff factor when inactive', () => {
    let now = 0;
    const scheduler = new Scheduler({ now: () => now, idleBackoffFactor: 4 });
    const run = vi.fn();
    scheduler.register('a', 1000, run);

    scheduler.tick(); // run #1
    scheduler.setActive(false);

    now = 1000;
    scheduler.tick(); // inactive interval = 4000ms → not due
    expect(run).toHaveBeenCalledTimes(1);

    now = 4000;
    scheduler.tick(); // 4000ms elapsed → due
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('stops running a task once its registration is disposed', () => {
    let now = 0;
    const scheduler = new Scheduler({ now: () => now });
    const run = vi.fn();
    const reg = scheduler.register('a', 100, run);

    scheduler.tick();
    expect(run).toHaveBeenCalledTimes(1);

    reg.dispose();
    now = 1000;
    scheduler.tick();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('reports task errors via onError without breaking the loop', () => {
    const now = 0;
    const onError = vi.fn();
    const scheduler = new Scheduler({ now: () => now, onError });
    scheduler.register('boom', 100, () => {
      throw new Error('kaboom');
    });
    const ok = vi.fn();
    scheduler.register('ok', 100, ok);

    scheduler.tick();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBe('boom');
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
