import * as vscode from 'vscode';
import type { FeatureContext } from '../../types';
import { getSettings, onSettingsChanged } from '../../core/config';
import { MonitorService } from './monitorService';
import { buildDashboardHtml, makeNonce } from './dashboard';
import { formatGb } from './metrics';

/** Local Monitoring (PLAN §6.4) — status-bar CPU/RAM plus a live dashboard. */
export function registerMonitor({ context, logger, scheduler, statusBar }: FeatureContext): void {
  const service = new MonitorService();
  let panel: vscode.WebviewPanel | undefined;
  let cpuThreshold = getSettings().cpuThreshold;
  let warnedHigh = false;

  function openDashboard(): void {
    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        'codeopsdeck.dashboard',
        'CodeOpsDeck Monitor',
        vscode.ViewColumn.Active,
        { enableScripts: true, retainContextWhenHidden: true },
      );
      panel.webview.html = buildDashboardHtml(makeNonce());
      panel.onDidDispose(() => (panel = undefined));
    }
    panel.reveal();
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('codeopsdeck.openDashboard', openDashboard),
    onSettingsChanged(() => {
      cpuThreshold = getSettings().cpuThreshold;
    }),
  );

  const intervalMs = Math.max(1, getSettings().monitorIntervalSeconds) * 1000;
  const registration = scheduler.register('monitor', intervalMs, () => {
    try {
      const sample = service.sample();
      statusBar.set('monitor', `$(pulse) CPU ${sample.cpu.toFixed(0)}% · RAM ${sample.ram.toFixed(0)}%`, {
        tooltip: 'CodeOpsDeck — open monitoring dashboard',
        command: 'codeopsdeck.openDashboard',
      });
      void panel?.webview.postMessage({
        type: 'sample',
        cpu: sample.cpu,
        ram: sample.ram,
        ramUsed: formatGb(sample.ramUsedBytes),
        ramTotal: formatGb(sample.ramTotalBytes),
      });

      // Threshold notification with hysteresis so it fires once per spike.
      if (sample.cpu >= cpuThreshold && !warnedHigh) {
        warnedHigh = true;
        void vscode.window.showWarningMessage(`CodeOpsDeck: CPU at ${sample.cpu.toFixed(0)}%`);
      } else if (sample.cpu < cpuThreshold * 0.9) {
        warnedHigh = false;
      }
    } catch (err) {
      logger.error('Monitor sample failed', err);
    }
  });
  context.subscriptions.push({ dispose: () => registration.dispose() });
}
