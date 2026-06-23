import * as vscode from 'vscode';
import type { Logger } from '../../core/logger';
import type { ContainerStats, ContainerSummary, DockerService } from './dockerService';
import { formatMb } from './stats';

export interface ContainerNode {
  kind: 'container';
  container: ContainerSummary;
}
interface MessageNode {
  kind: 'message';
  label: string;
  icon?: string;
}
type DockerNode = ContainerNode | MessageNode;

/** "Containers" tree with a status dot, ports and live CPU/mem per row (PLAN §6.2). */
export class DockerTreeProvider implements vscode.TreeDataProvider<DockerNode> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  private containers: ContainerSummary[] = [];
  private readonly statsById = new Map<string, ContainerStats>();
  private unavailableReason: string | undefined;
  private loaded = false;

  constructor(
    private readonly service: DockerService,
    private readonly logger: Logger,
  ) {}

  async refresh(): Promise<void> {
    const availability = await this.service.ping();
    if (!availability.available) {
      this.unavailableReason = availability.reason;
      this.containers = [];
      this.statsById.clear();
      this.loaded = true;
      this.emitter.fire();
      return;
    }
    this.unavailableReason = undefined;
    try {
      this.containers = await this.service.listContainers();
      await this.refreshStats();
    } catch (err) {
      this.logger.error('Docker list failed', err);
      this.unavailableReason = 'Failed to list containers';
      this.containers = [];
    }
    this.loaded = true;
    this.emitter.fire();
  }

  private async refreshStats(): Promise<void> {
    const running = this.containers.filter((c) => c.state === 'running');
    const ids = new Set(running.map((c) => c.id));
    for (const id of this.statsById.keys()) {
      if (!ids.has(id)) this.statsById.delete(id);
    }
    await Promise.all(
      running.map(async (c) => {
        const stats = await this.service.stats(c.id);
        if (stats) this.statsById.set(c.id, stats);
      }),
    );
  }

  getTreeItem(node: DockerNode): vscode.TreeItem {
    if (node.kind === 'message') {
      const item = new vscode.TreeItem(node.label);
      if (node.icon) item.iconPath = new vscode.ThemeIcon(node.icon);
      item.command = { command: 'codeopsdeck.docker.refresh', title: 'Retry' };
      return item;
    }
    const { container } = node;
    const item = new vscode.TreeItem(container.name);
    item.description = this.describe(container);
    item.iconPath = stateIcon(container.state);
    item.tooltip = new vscode.MarkdownString(
      `**${container.name}**\n\n${container.image}\n\n${container.status}` +
        (container.ports ? `\n\nPorts: ${container.ports}` : ''),
    );
    item.contextValue =
      container.state === 'running' ? 'codeopsdeck.container.running' : 'codeopsdeck.container.stopped';
    return item;
  }

  getChildren(node?: DockerNode): DockerNode[] {
    if (node) return [];
    if (!this.loaded) return [{ kind: 'message', label: 'Connecting to Docker…', icon: 'loading~spin' }];
    if (this.unavailableReason) return [{ kind: 'message', label: this.unavailableReason, icon: 'debug-disconnect' }];
    if (this.containers.length === 0) return [{ kind: 'message', label: 'No containers', icon: 'inbox' }];
    return this.containers.map((container) => ({ kind: 'container', container }));
  }

  private describe(container: ContainerSummary): string {
    const parts = [shortImage(container.image)];
    if (container.state === 'running') {
      const stats = this.statsById.get(container.id);
      if (stats) parts.push(`${stats.cpu.toFixed(0)}% · ${formatMb(stats.memUsed)}`);
      if (container.ports) parts.push(container.ports);
    } else {
      parts.push(container.status);
    }
    return parts.join(' · ');
  }
}

function shortImage(image: string): string {
  return image.length > 28 ? image.slice(0, 27) + '…' : image;
}

function stateIcon(state: string): vscode.ThemeIcon {
  switch (state) {
    case 'running':
      return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
    case 'paused':
    case 'restarting':
      return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.yellow'));
    default:
      return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('disabledForeground'));
  }
}
