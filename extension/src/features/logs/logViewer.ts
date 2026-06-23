import * as vscode from 'vscode';
import type { Logger } from '../../core/logger';
import type { LogSourceDef } from '../../core/projectConfig';
import { detectLevel, RingBuffer } from './logParsing';
import { LogTail } from './logTail';
import { makeNonce } from '../monitor/dashboard';

interface Viewer {
  panel: vscode.WebviewPanel;
  tail: LogTail;
  buffer: RingBuffer<string>;
}

/**
 * Manages one Log Viewer webview per source (PLAN §6.5): tails the file into a
 * capped ring buffer, streams lines to the webview, and handles save requests
 * natively via a Save dialog (no blob/CSP juggling in the page).
 */
export class LogViewerManager implements vscode.Disposable {
  private readonly viewers = new Map<string, Viewer>();

  constructor(
    private readonly getFolder: () => vscode.WorkspaceFolder | undefined,
    private readonly logger: Logger,
  ) {}

  async open(source?: LogSourceDef): Promise<void> {
    if (!source) return;
    const folder = this.getFolder();
    if (!folder) {
      void vscode.window.showWarningMessage('CodeOpsDeck: open a folder to view logs.');
      return;
    }

    const existing = this.viewers.get(source.name);
    if (existing) {
      existing.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeopsdeck.logViewer',
      `Logs: ${source.name}`,
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.webview.html = buildLogViewerHtml(makeNonce(), source.name);

    const buffer = new RingBuffer<string>(5000);
    let initialised = false;
    const post = (lines: string[]) => {
      void panel.webview.postMessage({
        type: initialised ? 'append' : 'init',
        lines: lines.map((t) => ({ t, l: detectLevel(t) })),
      });
      initialised = true;
    };

    const tail = new LogTail(folder, source.path, (lines) => {
      buffer.pushAll(lines);
      post(lines);
    });

    panel.webview.onDidReceiveMessage(async (message: { type?: string }) => {
      if (message?.type === 'download') await this.save(source, buffer);
      else if (message?.type === 'clear') buffer.clear();
    });

    panel.onDidDispose(() => {
      tail.dispose();
      this.viewers.delete(source.name);
    });

    this.viewers.set(source.name, { panel, tail, buffer });

    try {
      await tail.start();
    } catch (err) {
      this.logger.error('Log tail failed', err);
      void panel.webview.postMessage({
        type: 'init',
        lines: [{ t: `[CodeOpsDeck] could not open ${source.path}: ${String(err)}`, l: 'error' }],
      });
    }
  }

  private async save(source: LogSourceDef, buffer: RingBuffer<string>): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      saveLabel: 'Save logs',
      filters: { 'Log files': ['log', 'txt'] },
    });
    if (!uri) return;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(buffer.toArray().join('\n'), 'utf8'));
    void vscode.window.showInformationMessage(`CodeOpsDeck: saved ${source.name} logs.`);
  }

  dispose(): void {
    for (const viewer of this.viewers.values()) {
      viewer.tail.dispose();
      viewer.panel.dispose();
    }
    this.viewers.clear();
  }
}

function buildLogViewerHtml(nonce: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); margin: 0; display: flex; flex-direction: column; height: 100vh; }
  .toolbar { display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--vscode-panel-border, #333); flex: 0 0 auto; }
  .toolbar input[type=search], .toolbar select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); padding: 0.2rem 0.4rem; border-radius: 4px; }
  .toolbar input[type=search] { flex: 1 1 auto; }
  .toolbar button, .toolbar label { background: var(--vscode-button-secondaryBackground, #3a3d41); color: var(--vscode-button-secondaryForeground, #fff); border: none; padding: 0.25rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  .toolbar label { display: flex; align-items: center; gap: 0.3rem; }
  #log { flex: 1 1 auto; overflow: auto; padding: 0.5rem 0.75rem; font-family: var(--vscode-editor-font-family, monospace); font-size: var(--vscode-editor-font-size, 12px); white-space: pre-wrap; word-break: break-word; }
  .line { padding: 0 0.25rem; border-left: 3px solid transparent; }
  .line.error { border-left-color: var(--vscode-charts-red, #f85149); color: var(--vscode-charts-red, #f85149); }
  .line.warn { border-left-color: var(--vscode-charts-yellow, #d29922); }
  .line.info { border-left-color: var(--vscode-charts-blue, #58a6ff); }
  .line.debug { color: var(--vscode-descriptionForeground); }
  .count { color: var(--vscode-descriptionForeground); font-size: 0.8rem; margin-left: auto; }
</style>
</head>
<body>
  <div class="toolbar">
    <input id="search" type="search" placeholder="Filter ${escapeHtml(title)} logs…" />
    <select id="level">
      <option value="all">All levels</option>
      <option value="error">Error</option>
      <option value="warn">Warn</option>
      <option value="info">Info</option>
      <option value="debug">Debug</option>
    </select>
    <label><input id="follow" type="checkbox" checked /> Follow</label>
    <button id="clear">Clear</button>
    <button id="download">Save</button>
    <span class="count" id="count">0 lines</span>
  </div>
  <div id="log"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const MAX = 5000;
    let lines = [];
    const logEl = document.getElementById('log');
    const searchEl = document.getElementById('search');
    const levelEl = document.getElementById('level');
    const followEl = document.getElementById('follow');
    const countEl = document.getElementById('count');

    function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function render() {
      const q = searchEl.value.toLowerCase();
      const lvl = levelEl.value;
      const visible = lines.filter(x => (lvl === 'all' || x.l === lvl) && (!q || x.t.toLowerCase().includes(q)));
      logEl.innerHTML = visible.map(x => '<div class="line ' + x.l + '">' + esc(x.t) + '</div>').join('');
      countEl.textContent = visible.length + ' / ' + lines.length + ' lines';
      if (followEl.checked) logEl.scrollTop = logEl.scrollHeight;
    }

    window.addEventListener('message', (event) => {
      const m = event.data;
      if (!m) return;
      if (m.type === 'init') lines = m.lines.slice(-MAX);
      else if (m.type === 'append') { lines.push(...m.lines); if (lines.length > MAX) lines = lines.slice(-MAX); }
      else return;
      render();
    });

    searchEl.addEventListener('input', render);
    levelEl.addEventListener('change', render);
    document.getElementById('clear').addEventListener('click', () => { lines = []; vscode.postMessage({ type: 'clear' }); render(); });
    document.getElementById('download').addEventListener('click', () => vscode.postMessage({ type: 'download' }));
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
