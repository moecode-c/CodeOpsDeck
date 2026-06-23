import * as vscode from 'vscode';
import type { Logger } from '../../core/logger';
import type { FeatureContext } from '../../types';
import { DoctorService } from './doctorService';
import { DoctorTreeProvider } from './tree';
import { buildReportHtml } from './report';
import type { DoctorFix } from './types';

/** Environment Doctor ⭐ — the hero feature (PLAN §6.1). */
export function registerDoctor({ context, logger }: FeatureContext): void {
  const service = new DoctorService(logger);
  const tree = new DoctorTreeProvider(service, logger);
  let panel: vscode.WebviewPanel | undefined;

  async function openReport(): Promise<void> {
    await tree.refresh();
    const report = tree.lastReport;
    if (!report) return;
    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        'codeopsdeck.doctorReport',
        'Environment Doctor',
        vscode.ViewColumn.Active,
        { enableScripts: false },
      );
      panel.onDidDispose(() => (panel = undefined));
    }
    panel.webview.html = buildReportHtml(report);
    panel.reveal();
  }

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codeopsdeck.doctor', tree),
    vscode.commands.registerCommand('codeopsdeck.runDoctor', () => openReport()),
    vscode.commands.registerCommand('codeopsdeck.doctor.refresh', () => tree.refresh()),
    vscode.commands.registerCommand('codeopsdeck.doctor.applyFix', (fix: DoctorFix) => applyFix(fix, tree, logger)),
  );

  // Re-run when the project's config/env/compose files change.
  const watcher = vscode.workspace.createFileSystemWatcher(
    '**/{.codeopsdeck.json,.env,.env.example,docker-compose.yml,compose.yml}',
  );
  const onChange = () => void tree.refresh();
  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  watcher.onDidDelete(onChange);
  context.subscriptions.push(watcher);

  void tree.refresh();
}

async function applyFix(fix: DoctorFix, tree: DoctorTreeProvider, logger: Logger): Promise<void> {
  try {
    switch (fix.kind) {
      case 'openUrl':
        if (fix.url) await vscode.env.openExternal(vscode.Uri.parse(fix.url));
        break;
      case 'runCommand':
        if (fix.command) {
          const terminal = vscode.window.createTerminal('CodeOpsDeck');
          terminal.show();
          terminal.sendText(fix.command);
        }
        break;
      case 'copyEnvExample':
        await copyEnvExample(String(fix.args?.example ?? ''), String(fix.args?.target ?? '.env'));
        await tree.refresh();
        break;
    }
  } catch (err) {
    logger.error('Doctor fix failed', err);
    void vscode.window.showErrorMessage(`CodeOpsDeck: fix failed — ${String(err)}`);
  }
}

async function copyEnvExample(example: string, target: string): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder || !example) return;
  const src = vscode.Uri.joinPath(folder.uri, example);
  const dst = vscode.Uri.joinPath(folder.uri, target);
  await vscode.workspace.fs.copy(src, dst, { overwrite: false });
  void vscode.window.showInformationMessage(`CodeOpsDeck: created ${target} from ${example}`);
}
