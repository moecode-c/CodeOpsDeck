import * as vscode from 'vscode';
import type { FeatureContext } from '../../types';
import { getSettings } from '../../core/config';
import { loadHealthChecks } from '../../core/configLoader';
import { HealthService } from './healthService';
import { HealthTreeProvider } from './tree';
import { summarizeHealth, TransitionTracker } from './health';

/** Health Checks (PLAN §6.3) — poll endpoints, summarise in the status bar, notify on transitions. */
export function registerHealth({ context, logger, scheduler, statusBar }: FeatureContext): void {
  const service = new HealthService();
  const tracker = new TransitionTracker();
  const tree = new HealthTreeProvider();

  async function poll(): Promise<void> {
    try {
      const folder = vscode.workspace.workspaceFolders?.[0];
      const checks = folder ? await loadHealthChecks(folder) : [];
      if (checks.length === 0) {
        tree.setResults([], false);
        statusBar.remove('health');
        return;
      }

      const results = await service.checkAll(checks);
      tree.setResults(results, true);

      const { healthy, total } = summarizeHealth(results);
      statusBar.set('health', `${healthy === total ? '$(heart)' : '$(warning)'} ${healthy}/${total} healthy`, {
        tooltip: 'CodeOpsDeck health checks',
        command: 'codeopsdeck.openSidebar',
      });

      for (const transition of tracker.update(results)) {
        const message = `CodeOpsDeck: ${transition.name} is ${transition.up ? 'back up' : 'DOWN'}`;
        if (transition.up) void vscode.window.showInformationMessage(message);
        else void vscode.window.showWarningMessage(message);
      }
    } catch (err) {
      logger.error('Health poll failed', err);
    }
  }

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codeopsdeck.health', tree),
    vscode.commands.registerCommand('codeopsdeck.health.refresh', () => poll()),
  );

  const intervalMs = Math.max(5, getSettings().healthIntervalSeconds) * 1000;
  const registration = scheduler.register('health', intervalMs, () => poll());
  context.subscriptions.push({ dispose: () => registration.dispose() });

  void poll();
}
