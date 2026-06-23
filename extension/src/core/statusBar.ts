import * as vscode from 'vscode';

/**
 * Shared status-bar manager (PLAN §4 `statusBar.ts`). Features register named
 * items here instead of each creating their own, so priorities stay coherent.
 */

export interface StatusBarOptions {
  tooltip?: string;
  command?: string;
}

export class StatusBarManager {
  private readonly items = new Map<string, vscode.StatusBarItem>();

  constructor(
    private readonly alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Left,
    private readonly basePriority = 100,
  ) {}

  /** Create or update a named status-bar item, then show it. */
  set(id: string, text: string, options: StatusBarOptions = {}): vscode.StatusBarItem {
    let item = this.items.get(id);
    if (!item) {
      item = vscode.window.createStatusBarItem(this.alignment, this.basePriority - this.items.size);
      this.items.set(id, item);
    }
    item.text = text;
    item.tooltip = options.tooltip;
    item.command = options.command;
    item.show();
    return item;
  }

  remove(id: string): void {
    const item = this.items.get(id);
    if (item) {
      item.dispose();
      this.items.delete(id);
    }
  }

  dispose(): void {
    for (const item of this.items.values()) item.dispose();
    this.items.clear();
  }
}
