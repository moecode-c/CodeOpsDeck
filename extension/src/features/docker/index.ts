import * as vscode from 'vscode';
import type { FeatureContext } from '../../types';
import { getSettings } from '../../core/config';
import { DockerService } from './dockerService';
import { DockerTreeProvider, type ContainerNode } from './tree';

/** Docker Control Center (PLAN §6.2) — list, control and inspect containers. */
export function registerDocker({ context, logger, scheduler }: FeatureContext): void {
  const service = new DockerService(logger);
  const tree = new DockerTreeProvider(service, logger);
  const logStreams = new LogStreams(service, logger);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codeopsdeck.docker', tree),
    vscode.commands.registerCommand('codeopsdeck.docker.refresh', () => tree.refresh()),
    vscode.commands.registerCommand('codeopsdeck.docker.start', (node?: ContainerNode) =>
      runAction(node, logger, tree, 'start', (id) => service.start(id)),
    ),
    vscode.commands.registerCommand('codeopsdeck.docker.stop', (node?: ContainerNode) =>
      runAction(node, logger, tree, 'stop', (id) => service.stop(id)),
    ),
    vscode.commands.registerCommand('codeopsdeck.docker.restart', (node?: ContainerNode) =>
      runAction(node, logger, tree, 'restart', (id) => service.restart(id)),
    ),
    vscode.commands.registerCommand('codeopsdeck.docker.remove', (node?: ContainerNode) => removeContainer(node, service, tree, logger)),
    vscode.commands.registerCommand('codeopsdeck.docker.viewLogs', (node?: ContainerNode) => logStreams.open(node)),
    logStreams,
  );

  // Poll on the central scheduler so refreshes back off when the window is hidden.
  const intervalMs = Math.max(2, getSettings().dockerIntervalSeconds) * 1000;
  const registration = scheduler.register('docker', intervalMs, () => tree.refresh());
  context.subscriptions.push({ dispose: () => registration.dispose() });

  void tree.refresh();
}

async function runAction(
  node: ContainerNode | undefined,
  logger: { error(msg: string, ...a: unknown[]): void },
  tree: DockerTreeProvider,
  verb: string,
  action: (id: string) => Promise<unknown>,
): Promise<void> {
  if (node?.kind !== 'container') return;
  try {
    await action(node.container.id);
    await tree.refresh();
  } catch (err) {
    logger.error(`Docker ${verb} failed`, err);
    void vscode.window.showErrorMessage(`CodeOpsDeck: ${verb} failed — ${String(err)}`);
  }
}

async function removeContainer(
  node: ContainerNode | undefined,
  service: DockerService,
  tree: DockerTreeProvider,
  logger: { error(msg: string, ...a: unknown[]): void },
): Promise<void> {
  if (node?.kind !== 'container') return;
  const choice = await vscode.window.showWarningMessage(
    `Remove container "${node.container.name}"? This cannot be undone.`,
    { modal: true },
    'Remove',
  );
  if (choice !== 'Remove') return;
  try {
    await service.remove(node.container.id);
    await tree.refresh();
  } catch (err) {
    logger.error('Docker remove failed', err);
    void vscode.window.showErrorMessage(`CodeOpsDeck: remove failed — ${String(err)}`);
  }
}

/** Streams container logs into per-container output channels (PLAN §6.2). */
class LogStreams implements vscode.Disposable {
  private readonly channels = new Map<string, { channel: vscode.OutputChannel; stop: () => void }>();

  constructor(
    private readonly service: DockerService,
    private readonly logger: { error(msg: string, ...a: unknown[]): void },
  ) {}

  async open(node?: ContainerNode): Promise<void> {
    if (node?.kind !== 'container') return;
    const { id, name } = node.container;
    const existing = this.channels.get(id);
    if (existing) {
      existing.channel.show(true);
      return;
    }
    const channel = vscode.window.createOutputChannel(`Docker: ${name}`);
    channel.show(true);
    try {
      const stop = await this.service.streamLogs(id, (text) => channel.append(text));
      this.channels.set(id, { channel, stop });
    } catch (err) {
      this.logger.error('Docker logs failed', err);
      channel.appendLine(`[CodeOpsDeck] could not stream logs: ${String(err)}`);
    }
  }

  dispose(): void {
    for (const { channel, stop } of this.channels.values()) {
      stop();
      channel.dispose();
    }
    this.channels.clear();
  }
}
