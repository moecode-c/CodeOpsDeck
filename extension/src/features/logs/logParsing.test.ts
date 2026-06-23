import { describe, it, expect } from 'vitest';
import { detectLevel, RingBuffer, splitLines } from './logParsing';

describe('detectLevel', () => {
  it.each([
    ['2024-01-01 ERROR boom', 'error'],
    ['Exception in thread main', 'error'],
    ['WARN disk almost full', 'warn'],
    ['info: server started', 'info'],
    ['DEBUG cache hit', 'debug'],
    ['plain message', 'other'],
  ])('classifies "%s"', (line, level) => {
    expect(detectLevel(line)).toBe(level);
  });
});

describe('splitLines', () => {
  it('splits on LF and CRLF', () => {
    expect(splitLines('a\nb\r\nc')).toEqual(['a', 'b', 'c']);
  });
});

describe('RingBuffer', () => {
  it('keeps only the most recent items', () => {
    const buf = new RingBuffer<number>(3);
    buf.pushAll([1, 2, 3, 4, 5]);
    expect(buf.toArray()).toEqual([3, 4, 5]);
    expect(buf.size).toBe(3);
  });

  it('clears', () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.clear();
    expect(buf.toArray()).toEqual([]);
  });
});
