import * as vscode from 'vscode';

/**
 * A trivial read-only tree used by features whose full implementation lands in a
 * later section. It gives each view a friendly, honest empty-state row so the
 * sidebar is populated and the per-feature structure (PLAN §4) is in place.
 */

export interface PlaceholderNode {
  label: string;
  description?: string;
  tooltip?: string;
  icon?: string;
}

export class PlaceholderTreeProvider implements vscode.TreeDataProvider<PlaceholderNode> {
  constructor(private readonly nodes: PlaceholderNode[]) {}

  getTreeItem(node: PlaceholderNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.label);
    item.description = node.description;
    item.tooltip = node.tooltip;
    if (node.icon) item.iconPath = new vscode.ThemeIcon(node.icon);
    return item;
  }

  getChildren(): PlaceholderNode[] {
    return this.nodes;
  }
}

/** Register a placeholder tree for `viewId` and tidy it up on deactivate. */
export function registerPlaceholderView(
  context: vscode.ExtensionContext,
  viewId: string,
  nodes: PlaceholderNode[],
): void {
  const provider = new PlaceholderTreeProvider(nodes);
  context.subscriptions.push(vscode.window.registerTreeDataProvider(viewId, provider));
}
