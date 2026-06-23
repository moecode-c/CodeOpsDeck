import * as vscode from 'vscode';
import type { HealthResult } from './health';

type HealthNode = { kind: 'result'; result: HealthResult } | { kind: 'message'; label: string; tooltip?: string; icon?: string };

/** "Health" tree: one row per endpoint with status + latency (PLAN §6.3). */
export class HealthTreeProvider implements vscode.TreeDataProvider<HealthNode> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  private results: HealthResult[] = [];
  private configured = false;

  setResults(results: HealthResult[], configured: boolean): void {
    this.results = results;
    this.configured = configured;
    this.emitter.fire();
  }

  getTreeItem(node: HealthNode): vscode.TreeItem {
    if (node.kind === 'message') {
      const item = new vscode.TreeItem(node.label);
      item.tooltip = node.tooltip;
      if (node.icon) item.iconPath = new vscode.ThemeIcon(node.icon);
      return item;
    }
    const { result } = node;
    const item = new vscode.TreeItem(result.name);
    item.description = result.up
      ? `${result.status} · ${result.latencyMs}ms`
      : result.error
        ? 'unreachable'
        : `${result.status} down`;
    item.iconPath = result.up
      ? new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'))
      : new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
    item.tooltip = `${result.url}\n${result.up ? 'healthy' : result.error ?? 'unhealthy'}`;
    return item;
  }

  getChildren(node?: HealthNode): HealthNode[] {
    if (node) return [];
    if (!this.configured) {
      return [
        {
          kind: 'message',
          label: 'No health checks configured',
          tooltip: 'Add a "healthChecks" array to .codeopsdeck.json',
          icon: 'info',
        },
      ];
    }
    if (this.results.length === 0) return [{ kind: 'message', label: 'No endpoints', icon: 'info' }];
    return this.results.map((result) => ({ kind: 'result', result }));
  }
}
