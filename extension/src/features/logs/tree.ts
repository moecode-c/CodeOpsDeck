import * as vscode from 'vscode';
import type { LogSourceDef } from '../../core/projectConfig';

type LogsNode =
  | { kind: 'source'; source: LogSourceDef }
  | { kind: 'message'; label: string; tooltip?: string; icon?: string };

/** "Logs" tree: one row per configured log source (PLAN §6.5). */
export class LogsTreeProvider implements vscode.TreeDataProvider<LogsNode> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;
  private sources: LogSourceDef[] = [];

  setSources(sources: LogSourceDef[]): void {
    this.sources = sources;
    this.emitter.fire();
  }

  getTreeItem(node: LogsNode): vscode.TreeItem {
    if (node.kind === 'message') {
      const item = new vscode.TreeItem(node.label);
      item.tooltip = node.tooltip;
      if (node.icon) item.iconPath = new vscode.ThemeIcon(node.icon);
      return item;
    }
    const item = new vscode.TreeItem(node.source.name);
    item.description = node.source.path;
    item.iconPath = new vscode.ThemeIcon('output');
    item.tooltip = `Open ${node.source.path} in the Log Viewer`;
    item.command = { command: 'codeopsdeck.logs.open', title: 'Open Logs', arguments: [node] };
    return item;
  }

  getChildren(node?: LogsNode): LogsNode[] {
    if (node) return [];
    if (this.sources.length === 0) {
      return [
        {
          kind: 'message',
          label: 'No log sources configured',
          tooltip: 'Add a "logs" array to .codeopsdeck.json',
          icon: 'info',
        },
      ];
    }
    return this.sources.map((source) => ({ kind: 'source', source }));
  }
}

export type { LogsNode };
