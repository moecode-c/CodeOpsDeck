/**
 * Central scheduler — one timer drives every periodic task in the extension.
 *
 * PLAN §4 design rule: a single scheduler (not N timers) that backs off when the
 * window is hidden/unfocused and respects per-feature intervals. This is the
 * biggest lever for keeping CodeOpsDeck "lightweight".
 *
 * The class is deliberately free of any `vscode` import so it can be unit-tested
 * with an injected clock.
 */

export type TaskFn = () => void | Promise<void>;

export interface ScheduledRegistration {
  /** Stop running this task and remove it from the scheduler. */
  dispose(): void;
}

export interface SchedulerOptions {
  /** Base granularity of the internal timer, in ms. Default 1000. */
  tickMs?: number;
  /** Interval multiplier applied while inactive (window unfocused). Default 4. */
  idleBackoffFactor?: number;
  /** Injectable clock — defaults to `Date.now`. Used by tests. */
  now?: () => number;
  /** Notified when a task throws/rejects, so the host can log it. */
  onError?: (id: string, err: unknown) => void;
}

interface Registered {
  id: string;
  intervalMs: number;
  run: TaskFn;
  lastRun: number;
  running: boolean;
  enabled: boolean;
}

export class Scheduler {
  private readonly tasks = new Map<string, Registered>();
  private readonly tickMs: number;
  private readonly idleBackoffFactor: number;
  private readonly now: () => number;
  private readonly onError?: (id: string, err: unknown) => void;
  private handle: ReturnType<typeof setInterval> | undefined;
  private active = true;

  constructor(options: SchedulerOptions = {}) {
    this.tickMs = options.tickMs ?? 1000;
    this.idleBackoffFactor = options.idleBackoffFactor ?? 4;
    this.now = options.now ?? (() => Date.now());
    this.onError = options.onError;
  }

  /** Register a task. It runs on the first tick, then every `intervalMs`. */
  register(id: string, intervalMs: number, run: TaskFn): ScheduledRegistration {
    this.tasks.set(id, {
      id,
      intervalMs,
      run,
      lastRun: Number.NEGATIVE_INFINITY,
      running: false,
      enabled: true,
    });
    return { dispose: () => void this.tasks.delete(id) };
  }

  setInterval(id: string, intervalMs: number): void {
    const task = this.tasks.get(id);
    if (task) task.intervalMs = intervalMs;
  }

  setEnabled(id: string, enabled: boolean): void {
    const task = this.tasks.get(id);
    if (task) task.enabled = enabled;
  }

  /** When inactive, intervals are stretched by `idleBackoffFactor`. */
  setActive(active: boolean): void {
    this.active = active;
  }

  start(): void {
    if (this.handle) return;
    this.handle = setInterval(() => this.tick(), this.tickMs);
  }

  stop(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = undefined;
    }
  }

  /** Run every task whose interval has elapsed. Public so tests can drive it. */
  tick(): void {
    const now = this.now();
    for (const task of this.tasks.values()) {
      if (!task.enabled || task.running) continue;
      const interval = this.active ? task.intervalMs : task.intervalMs * this.idleBackoffFactor;
      if (now - task.lastRun < interval) continue;

      task.lastRun = now;
      task.running = true;
      try {
        const result = task.run();
        if (result instanceof Promise) {
          result.then(
            () => void (task.running = false),
            (err: unknown) => {
              task.running = false;
              this.onError?.(task.id, err);
            },
          );
        } else {
          task.running = false;
        }
      } catch (err) {
        task.running = false;
        this.onError?.(task.id, err);
      }
    }
  }

  dispose(): void {
    this.stop();
    this.tasks.clear();
  }
}
