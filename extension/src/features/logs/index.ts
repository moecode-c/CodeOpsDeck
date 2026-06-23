import * as vscode from 'vscode';
import type { FeatureContext } from '../../types';
import { loadLogSources } from '../../core/configLoader';
import { LogsTreeProvider, type LogsNode } from './tree';
import { LogViewerManager } from './logViewer';

/** Local Logs (PLAN §6.5) — list configured sources and open them in the Log Viewer. */
export function registerLogs({ context, logger }: FeatureContext): void {
  const tree = new LogsTreeProvider();
  const viewers = new LogViewerManager(() => vscode.workspace.workspaceFolders?.[0], logger);

  async function refresh(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    tree.setSources(folder ? await loadLogSources(folder) : []);
  }

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codeopsdeck.logs', tree),
    vscode.commands.registerCommand('codeopsdeck.logs.refresh', () => refresh()),
    vscode.commands.registerCommand('codeopsdeck.logs.open', (node?: LogsNode) => {
      if (node?.kind === 'source') void viewers.open(node.source);
    }),
    viewers,
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/.codeopsdeck.json');
  const onChange = () => void refresh();
  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  watcher.onDidDelete(onChange);
  context.subscriptions.push(watcher);

  void refresh();
}
