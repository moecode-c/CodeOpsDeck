import * as vscode from 'vscode';
import type { FeatureContext } from '../types';
import { getSettings } from '../core/config';
import { loadHealthChecks, loadLogSources } from '../core/configLoader';
import { DoctorService } from '../features/doctor/doctorService';
import { buildReportHtml } from '../features/doctor/report';
import type { DoctorFix } from '../features/doctor/types';
import { DockerService, type ContainerSummary } from '../features/docker/dockerService';
import { formatMb } from '../features/docker/stats';
import { HealthService } from '../features/health/healthService';
import { summarizeHealth, TransitionTracker } from '../features/health/health';
import { MonitorService } from '../features/monitor/monitorService';
import { buildDashboardHtml, makeNonce } from '../features/monitor/dashboard';
import { formatGb } from '../features/monitor/metrics';
import { LogViewerManager } from '../features/logs/logViewer';
import { buildMainHtml } from './webviewContent';

/**
 * Single sidebar webview that hosts the icon-navbar UI. It owns the feature
 * services, pushes their state into the webview, and routes webview actions
 * back to them. The status bar stays driven here too (visible even when the
 * sidebar is closed).
 */
export class MainViewProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'codeopsdeck.main';

  private view?: vscode.WebviewView;
  private readonly doctor: DoctorService;
  private readonly docker: DockerService;
  private readonly health = new HealthService();
  private readonly monitor = new MonitorService();
  private readonly logs: LogViewerManager;
  private readonly tracker = new TransitionTracker();
  private readonly dockerLogs = new Map<string, { channel: vscode.OutputChannel; stop: () => void }>();
  private reportPanel?: vscode.WebviewPanel;
  private dashboardPanel?: vscode.WebviewPanel;
  private cpuThreshold: number;
  private warnedHigh = false;

  constructor(private readonly deps: FeatureContext) {
    this.doctor = new DoctorService(deps.logger);
    this.docker = new DockerService(deps.logger);
    this.logs = new LogViewerManager(() => vscode.workspace.workspaceFolders?.[0], deps.logger);
    this.cpuThreshold = getSettings().cpuThreshold;
  }

  /** Register the provider, palette commands, scheduler tasks and watchers. */
  register(): vscode.Disposable[] {
    const settings = getSettings();
    const monitorTask = this.deps.scheduler.register('monitor', Math.max(1, settings.monitorIntervalSeconds) * 1000, () => this.sampleMonitor());
    const healthTask = this.deps.scheduler.register('health', Math.max(5, settings.healthIntervalSeconds) * 1000, () => this.refreshHealth());
    const dockerTask = this.deps.scheduler.register('docker', Math.max(2, settings.dockerIntervalSeconds) * 1000, () => this.tickDocker());

    const watcher = vscode.workspace.createFileSystemWatcher('**/{.codeopsdeck.json,.env,.env.example,docker-compose.yml,compose.yml}');
    const onConfig = () => {
      void this.refreshDoctor();
      void this.refreshHealth();
      void this.refreshLogs();
    };
    watcher.onDidChange(onConfig);
    watcher.onDidCreate(onConfig);
    watcher.onDidDelete(onConfig);

    return [
      vscode.window.registerWebviewViewProvider(MainViewProvider.viewId, this, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
      vscode.commands.registerCommand('codeopsdeck.runDoctor', () => this.openReport()),
      vscode.commands.registerCommand('codeopsdeck.openDashboard', () => this.openDashboard()),
      vscode.commands.registerCommand('codeopsdeck.refresh', () => this.refreshAll()),
      watcher,
      this.logs,
      { dispose: () => monitorTask.dispose() },
      { dispose: () => healthTask.dispose() },
      { dispose: () => dockerTask.dispose() },
      { dispose: () => this.disposeDockerLogs() },
    ];
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.deps.context.extensionUri] };
    view.webview.html = buildMainHtml(view.webview, makeNonce());
    view.webview.onDidReceiveMessage((message) => this.onMessage(message));
    view.onDidDispose(() => (this.view = undefined));
    view.onDidChangeVisibility(() => {
      if (view.visible) this.refreshAll();
    });
  }

  private onMessage(message: { type?: string; action?: string; payload?: any }): void {
    if (message?.type === 'ready') {
      this.refreshAll();
      return;
    }
    if (message?.type !== 'action') return;
    const id: string | undefined = message.payload?.id;
    switch (message.action) {
      case 'doctor.refresh': void this.refreshDoctor(); break;
      case 'doctor.report': void this.openReport(); break;
      case 'doctor.fix': void this.applyFix(message.payload as DoctorFix); break;
      case 'docker.refresh': void this.refreshDocker(); break;
      case 'docker.start': void this.dockerAction('start', id); break;
      case 'docker.stop': void this.dockerAction('stop', id); break;
      case 'docker.restart': void this.dockerAction('restart', id); break;
      case 'docker.remove': void this.removeContainer(id); break;
      case 'docker.logs': void this.streamDockerLogs(id); break;
      case 'health.refresh': void this.refreshHealth(); break;
      case 'monitor.dashboard': this.openDashboard(); break;
      case 'logs.open': void this.logs.open(message.payload); break;
    }
  }

  private refreshAll(): void {
    void this.refreshDoctor();
    void this.refreshDocker();
    void this.refreshHealth();
    void this.refreshLogs();
    this.sampleMonitor();
  }

  private post(message: unknown): void {
    void this.view?.webview.postMessage(message);
  }

  // ---- Doctor ----
  private async refreshDoctor(): Promise<void> {
    this.post({ type: 'doctor', report: { loading: true } });
    try {
      this.post({ type: 'doctor', report: await this.doctor.run() });
    } catch (err) {
      this.deps.logger.error('Doctor run failed', err);
    }
  }

  private async openReport(): Promise<void> {
    const report = await this.doctor.run();
    if (!this.reportPanel) {
      this.reportPanel = vscode.window.createWebviewPanel('codeopsdeck.doctorReport', 'Environment Doctor', vscode.ViewColumn.Active, { enableScripts: false });
      this.reportPanel.onDidDispose(() => (this.reportPanel = undefined));
    }
    this.reportPanel.webview.html = buildReportHtml(report);
    this.reportPanel.reveal();
  }

  private async applyFix(fix?: DoctorFix): Promise<void> {
    if (!fix) return;
    try {
      if (fix.kind === 'openUrl' && fix.url) {
        await vscode.env.openExternal(vscode.Uri.parse(fix.url));
      } else if (fix.kind === 'runCommand' && fix.command) {
        const terminal = vscode.window.createTerminal('CodeOpsDeck');
        terminal.show();
        terminal.sendText(fix.command);
      } else if (fix.kind === 'copyEnvExample') {
        await this.copyEnv(String(fix.args?.example ?? ''), String(fix.args?.target ?? '.env'));
        await this.refreshDoctor();
      }
    } catch (err) {
      this.deps.logger.error('Doctor fix failed', err);
      void vscode.window.showErrorMessage(`CodeOpsDeck: fix failed — ${String(err)}`);
    }
  }

  private async copyEnv(example: string, target: string): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder || !example) return;
    await vscode.workspace.fs.copy(vscode.Uri.joinPath(folder.uri, example), vscode.Uri.joinPath(folder.uri, target), { overwrite: false });
    void vscode.window.showInformationMessage(`CodeOpsDeck: created ${target} from ${example}`);
  }

  // ---- Docker ----
  private async tickDocker(): Promise<void> {
    if (this.view?.visible) await this.refreshDocker();
  }

  private async refreshDocker(): Promise<void> {
    const availability = await this.docker.ping();
    if (!availability.available) {
      this.post({ type: 'docker', available: false, reason: availability.reason, containers: [] });
      return;
    }
    try {
      const containers = await this.docker.listContainers();
      const rendered = await Promise.all(
        containers.map(async (c) => ({ id: c.id, name: c.name, state: c.state, detail: await this.describeContainer(c) })),
      );
      this.post({ type: 'docker', available: true, containers: rendered });
    } catch (err) {
      this.deps.logger.error('Docker list failed', err);
      this.post({ type: 'docker', available: false, reason: 'Failed to list containers', containers: [] });
    }
  }

  private async describeContainer(c: ContainerSummary): Promise<string> {
    const image = c.image.length > 24 ? c.image.slice(0, 23) + '…' : c.image;
    if (c.state !== 'running') return `${image} · ${c.status}`;
    const stats = await this.docker.stats(c.id);
    return stats ? `${image} · ${Math.round(stats.cpu)}% · ${formatMb(stats.memUsed)}` : `${image} · running`;
  }

  private async dockerAction(verb: 'start' | 'stop' | 'restart', id?: string): Promise<void> {
    if (!id) return;
    try {
      if (verb === 'start') await this.docker.start(id);
      else if (verb === 'stop') await this.docker.stop(id);
      else await this.docker.restart(id);
      await this.refreshDocker();
    } catch (err) {
      this.deps.logger.error(`Docker ${verb} failed`, err);
      void vscode.window.showErrorMessage(`CodeOpsDeck: ${verb} failed — ${String(err)}`);
    }
  }

  private async removeContainer(id?: string): Promise<void> {
    if (!id) return;
    const choice = await vscode.window.showWarningMessage('Remove this container? This cannot be undone.', { modal: true }, 'Remove');
    if (choice !== 'Remove') return;
    try {
      await this.docker.remove(id);
      await this.refreshDocker();
    } catch (err) {
      this.deps.logger.error('Docker remove failed', err);
      void vscode.window.showErrorMessage(`CodeOpsDeck: remove failed — ${String(err)}`);
    }
  }

  private async streamDockerLogs(id?: string): Promise<void> {
    if (!id) return;
    const existing = this.dockerLogs.get(id);
    if (existing) {
      existing.channel.show(true);
      return;
    }
    const channel = vscode.window.createOutputChannel('Docker logs');
    channel.show(true);
    try {
      const stop = await this.docker.streamLogs(id, (text) => channel.append(text));
      this.dockerLogs.set(id, { channel, stop });
    } catch (err) {
      this.deps.logger.error('Docker logs failed', err);
      channel.appendLine(`[CodeOpsDeck] could not stream logs: ${String(err)}`);
    }
  }

  private disposeDockerLogs(): void {
    for (const entry of this.dockerLogs.values()) {
      entry.stop();
      entry.channel.dispose();
    }
    this.dockerLogs.clear();
  }

  // ---- Health ----
  private async refreshHealth(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const checks = folder ? await loadHealthChecks(folder) : [];
    if (!checks.length) {
      this.post({ type: 'health', configured: false, results: [] });
      this.deps.statusBar.remove('health');
      return;
    }
    const results = await this.health.checkAll(checks);
    this.post({
      type: 'health',
      configured: true,
      results: results.map((r) => ({
        name: r.name,
        up: r.up,
        detail: r.up ? `${r.status} · ${r.latencyMs}ms` : r.error ? 'unreachable' : `${r.status} down`,
      })),
    });
    const { healthy, total } = summarizeHealth(results);
    this.deps.statusBar.set('health', `${healthy === total ? '$(heart)' : '$(warning)'} ${healthy}/${total} healthy`, {
      tooltip: 'CodeOpsDeck health checks',
      command: 'codeopsdeck.openSidebar',
    });
    for (const transition of this.tracker.update(results)) {
      const message = `CodeOpsDeck: ${transition.name} is ${transition.up ? 'back up' : 'DOWN'}`;
      if (transition.up) void vscode.window.showInformationMessage(message);
      else void vscode.window.showWarningMessage(message);
    }
  }

  // ---- Monitor ----
  private sampleMonitor(): void {
    try {
      const sample = this.monitor.sample();
      const payload = { cpu: sample.cpu, ram: sample.ram, ramUsed: formatGb(sample.ramUsedBytes), ramTotal: formatGb(sample.ramTotalBytes) };
      this.deps.statusBar.set('monitor', `$(pulse) CPU ${Math.round(sample.cpu)}% · RAM ${Math.round(sample.ram)}%`, {
        tooltip: 'CodeOpsDeck — open monitoring dashboard',
        command: 'codeopsdeck.openDashboard',
      });
      this.post({ type: 'monitor', sample: payload });
      void this.dashboardPanel?.webview.postMessage({ type: 'sample', ...payload });
      if (sample.cpu >= this.cpuThreshold && !this.warnedHigh) {
        this.warnedHigh = true;
        void vscode.window.showWarningMessage(`CodeOpsDeck: CPU at ${Math.round(sample.cpu)}%`);
      } else if (sample.cpu < this.cpuThreshold * 0.9) {
        this.warnedHigh = false;
      }
    } catch (err) {
      this.deps.logger.error('Monitor sample failed', err);
    }
  }

  private openDashboard(): void {
    if (!this.dashboardPanel) {
      this.dashboardPanel = vscode.window.createWebviewPanel('codeopsdeck.dashboard', 'CodeOpsDeck Monitor', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      this.dashboardPanel.webview.html = buildDashboardHtml(makeNonce());
      this.dashboardPanel.onDidDispose(() => (this.dashboardPanel = undefined));
    }
    this.dashboardPanel.reveal();
  }

  // ---- Logs ----
  private async refreshLogs(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const sources = folder ? await loadLogSources(folder) : [];
    this.post({ type: 'logs', sources });
  }
}
