import * as vscode from 'vscode';
import type { LogLevel } from './logger';

/** Thin reader over `codeopsdeck.*` VS Code settings (PLAN §5, layer 1). */

export interface Settings {
  logLevel: LogLevel;
  healthIntervalSeconds: number;
  monitorIntervalSeconds: number;
  dockerIntervalSeconds: number;
  cpuThreshold: number;
  telemetryEnabled: boolean;
}

export function getSettings(): Settings {
  const c = vscode.workspace.getConfiguration('codeopsdeck');
  return {
    logLevel: c.get<LogLevel>('logLevel', 'info'),
    healthIntervalSeconds: c.get<number>('health.intervalSeconds', 30),
    monitorIntervalSeconds: c.get<number>('monitor.intervalSeconds', 5),
    dockerIntervalSeconds: c.get<number>('docker.intervalSeconds', 4),
    cpuThreshold: c.get<number>('monitor.cpuThreshold', 85),
    telemetryEnabled: c.get<boolean>('telemetry.enabled', false),
  };
}

/** Fire `callback` whenever any `codeopsdeck.*` setting changes. */
export function onSettingsChanged(callback: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('codeopsdeck')) callback();
  });
}
