import * as vscode from 'vscode';

/** Leveled logging to a dedicated VS Code output channel (PLAN §4 `logger.ts`). */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export class Logger {
  private readonly channel: vscode.OutputChannel;
  private level: LogLevel = 'info';

  constructor(name = 'CodeOpsDeck') {
    this.channel = vscode.window.createOutputChannel(name);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: unknown[]): void {
    this.write('debug', message, args);
  }
  info(message: string, ...args: unknown[]): void {
    this.write('info', message, args);
  }
  warn(message: string, ...args: unknown[]): void {
    this.write('warn', message, args);
  }
  error(message: string, ...args: unknown[]): void {
    this.write('error', message, args);
  }

  show(): void {
    this.channel.show(true);
  }

  dispose(): void {
    this.channel.dispose();
  }

  private write(level: LogLevel, message: string, args: unknown[]): void {
    if (ORDER[level] < ORDER[this.level]) return;
    const extra = args.length ? ' ' + args.map(stringify).join(' ') : '';
    this.channel.appendLine(`${new Date().toISOString()} [${level.toUpperCase()}] ${message}${extra}`);
  }
}

function stringify(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
