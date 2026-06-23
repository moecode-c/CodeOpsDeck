import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './events';

interface TestEvents extends Record<string, unknown> {
  ping: number;
}

describe('EventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('ping', listener);
    bus.emit('ping', 42);
    expect(listener).toHaveBeenCalledWith(42);
  });

  it('unsubscribes via the returned disposer', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    const off = bus.on('ping', listener);
    off();
    bus.emit('ping', 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a throwing listener from the rest', () => {
    const bus = new EventBus<TestEvents>();
    bus.on('ping', () => {
      throw new Error('boom');
    });
    const ok = vi.fn();
    bus.on('ping', ok);
    expect(() => bus.emit('ping', 1)).not.toThrow();
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
