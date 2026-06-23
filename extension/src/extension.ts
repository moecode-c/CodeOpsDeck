import * as vscode from 'vscode';
import { Logger } from './core/logger';
import { Scheduler } from './core/scheduler';
import { StatusBarManager } from './core/statusBar';
import { EventBus } from './core/events';
import { getSettings, onSettingsChanged } from './core/config';
import type { AppEvents, FeatureContext } from './types';
import { MainViewProvider } from './ui/mainView';

/**
 * Extension entry point — wiring only (PLAN §4). Builds the shared core
 * services and hands them to the single sidebar webview (icon-navbar UI), then
 * connects the scheduler to the window-focus signal so polling backs off when
 * the window is hidden.
 */

let scheduler: Scheduler | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const logger = new Logger('CodeOpsDeck');
  logger.setLevel(getSettings().logLevel);
  logger.info('Activating CodeOpsDeck…');

  const events = new EventBus<AppEvents>();
  const statusBar = new StatusBarManager();
  scheduler = new Scheduler({
    onError: (id, err) => logger.error(`Scheduled task "${id}" failed`, err),
  });

  const deps: FeatureContext = { context, logger, scheduler, statusBar, events };

  // The whole sidebar UI + feature orchestration lives in one webview provider.
  const main = new MainViewProvider(deps);
  context.subscriptions.push(...main.register());

  context.subscriptions.push(
    vscode.commands.registerCommand('codeopsdeck.openSidebar', () =>
      vscode.commands.executeCommand('workbench.view.extension.codeopsdeck'),
    ),
    vscode.commands.registerCommand('codeopsdeck.showLogs', () => logger.show()),
  );

  // PLAN §4 design rule: back off the scheduler when the window loses focus.
  scheduler.setActive(vscode.window.state.focused);
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => scheduler?.setActive(state.focused)),
  );
  scheduler.start();

  context.subscriptions.push(
    onSettingsChanged(() => {
      logger.setLevel(getSettings().logLevel);
      events.emit('config:changed', undefined);
      logger.debug('Settings reloaded');
    }),
  );

  statusBar.set('root', '$(dashboard) CodeOpsDeck', {
    tooltip: 'CodeOpsDeck — click to open',
    command: 'codeopsdeck.openSidebar',
  });

  context.subscriptions.push(logger, statusBar, { dispose: () => scheduler?.dispose() });
  logger.info('CodeOpsDeck activated.');
}

export function deactivate(): void {
  scheduler?.dispose();
  scheduler = undefined;
}
