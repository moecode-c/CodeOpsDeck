import * as vscode from 'vscode';
import type { MetricSample } from './monitorService';
import { formatGb } from './metrics';

interface Row {
  label: string;
  value: string;
  icon: string;
}

/** Compact CPU/RAM rows in the sidebar; clicking opens the full dashboard. */
export class MonitorTreeProvider implements vscode.TreeDataProvider<Row> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;
  private sample: MetricSample | undefined;

  update(sample: MetricSample): void {
    this.sample = sample;
    this.emitter.fire();
  }

  getTreeItem(row: Row): vscode.TreeItem {
    const item = new vscode.TreeItem(row.label);
    item.description = row.value;
    item.iconPath = new vscode.ThemeIcon(row.icon);
    item.command = { command: 'codeopsdeck.openDashboard', title: 'Open dashboard' };
    return item;
  }

  getChildren(): Row[] {
    const sample = this.sample;
    if (!sample) return [{ label: 'Sampling…', value: '', icon: 'loading~spin' }];
    return [
      { label: 'CPU', value: `${sample.cpu.toFixed(0)}%`, icon: 'pulse' },
      {
        label: 'Memory',
        value: `${sample.ram.toFixed(0)}% · ${formatGb(sample.ramUsedBytes)} / ${formatGb(sample.ramTotalBytes)}`,
        icon: 'server',
      },
    ];
  }
}
