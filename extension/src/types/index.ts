import type * as vscode from 'vscode';
import type { Logger } from '../core/logger';
import type { Scheduler } from '../core/scheduler';
import type { StatusBarManager } from '../core/statusBar';
import type { EventBus } from '../core/events';

/**
 * Events carried on the internal {@link EventBus}. The map grows as features
 * land; `void` marks an event with no payload.
 */
export interface AppEvents extends Record<string, unknown> {
  'config:changed': void;
  'health:changed': { name: string; up: boolean; status: number; latencyMs: number };
  'docker:changed': void;
  'metrics:sampled': { cpu: number; memUsed: number; memTotal: number };
}

/** Shared services handed to every feature's `register*` function (PLAN §4). */
export interface FeatureContext {
  context: vscode.ExtensionContext;
  logger: Logger;
  scheduler: Scheduler;
  statusBar: StatusBarManager;
  events: EventBus<AppEvents>;
}
