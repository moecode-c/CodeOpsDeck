/** Pure log helpers (PLAN §6.5) — level detection, line splitting, ring buffer. */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'other';

export function detectLevel(line: string): LogLevel {
  const upper = line.toUpperCase();
  if (/\b(ERROR|ERR|FATAL|EXCEPTION)\b/.test(upper)) return 'error';
  if (/\b(WARN|WARNING)\b/.test(upper)) return 'warn';
  if (/\b(INFO|NOTICE)\b/.test(upper)) return 'info';
  if (/\b(DEBUG|TRACE|VERBOSE)\b/.test(upper)) return 'debug';
  return 'other';
}

export function splitLines(chunk: string): string[] {
  return chunk.split(/\r?\n/);
}

/** Fixed-capacity buffer that keeps only the most recent `cap` items. */
export class RingBuffer<T> {
  private items: T[] = [];

  constructor(private readonly cap: number) {}

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.cap) {
      this.items.splice(0, this.items.length - this.cap);
    }
  }

  pushAll(items: T[]): void {
    for (const item of items) this.push(item);
  }

  toArray(): T[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }

  get size(): number {
    return this.items.length;
  }
}
