import * as vscode from 'vscode';
import type { Logger } from '../../core/logger';
import type { DoctorService } from './doctorService';
import type { CheckGroup, CheckStatus, DoctorReport } from './types';

type DoctorNode =
  | { kind: 'group'; group: CheckGroup }
  | { kind: 'item'; group: CheckGroup; index: number }
  | { kind: 'message'; label: string; icon?: string };

/** Sidebar tree for the Doctor: groups (Tools/Services/Environment) with ✓/✗/⚠ rows. */
export class DoctorTreeProvider implements vscode.TreeDataProvider<DoctorNode> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;
  private report: DoctorReport | undefined;
  private running = false;

  constructor(
    private readonly service: DoctorService,
    private readonly logger: Logger,
  ) {}

  get lastReport(): DoctorReport | undefined {
    return this.report;
  }

  async refresh(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.emitter.fire();
    try {
      this.report = await this.service.run();
    } catch (err) {
      this.logger.error('Doctor run failed', err);
      this.report = undefined;
    } finally {
      this.running = false;
      this.emitter.fire();
    }
  }

  getTreeItem(node: DoctorNode): vscode.TreeItem {
    if (node.kind === 'message') {
      const item = new vscode.TreeItem(node.label);
      if (node.icon) item.iconPath = new vscode.ThemeIcon(node.icon);
      return item;
    }
    if (node.kind === 'group') {
      const item = new vscode.TreeItem(node.group.label, vscode.TreeItemCollapsibleState.Expanded);
      item.description = describeGroup(node.group);
      return item;
    }
    const check = node.group.items[node.index];
    const item = new vscode.TreeItem(check.label);
    item.description = check.detail;
    item.iconPath = statusIcon(check.status);
    item.tooltip = check.fix?.label ?? check.detail;
    if (check.fix) {
      item.command = { command: 'codeopsdeck.doctor.applyFix', title: check.fix.label, arguments: [check.fix] };
      item.contextValue = 'codeopsdeck.doctor.fixable';
    }
    return item;
  }

  getChildren(node?: DoctorNode): DoctorNode[] {
    if (!node) {
      if (this.running && !this.report) return [{ kind: 'message', label: 'Running diagnostics…', icon: 'loading~spin' }];
      if (!this.report) return [{ kind: 'message', label: 'Run the Doctor to begin', icon: 'pulse' }];
      if (!this.report.hasWorkspace) return [{ kind: 'message', label: 'Open a folder to run the Doctor', icon: 'folder' }];
      if (this.report.groups.length === 0) return [{ kind: 'message', label: 'Nothing to check yet', icon: 'check' }];
      return this.report.groups.map((group) => ({ kind: 'group', group }));
    }
    if (node.kind === 'group') {
      return node.group.items.map((_item, index) => ({ kind: 'item', group: node.group, index }));
    }
    return [];
  }
}

function describeGroup(group: CheckGroup): string {
  const fails = group.items.filter((i) => i.status === 'fail').length;
  const warns = group.items.filter((i) => i.status === 'warn').length;
  if (fails) return `${fails} failing`;
  if (warns) return `${warns} warning${warns === 1 ? '' : 's'}`;
  return 'all good';
}

function statusIcon(status: CheckStatus): vscode.ThemeIcon {
  switch (status) {
    case 'ok':
      return new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
    case 'warn':
      return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
    case 'fail':
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
  }
}
