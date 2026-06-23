import type { CheckGroup, CheckItem, CheckStatus, DoctorReport } from './types';

/**
 * Builds the standalone HTML for the shareable Doctor report (PLAN §6.1).
 * Static markup, no scripts — a strict CSP and `enableScripts: false` keep the
 * webview safe, and it screenshots cleanly.
 */
export function buildReportHtml(report: DoctorReport): string {
  const { ok, warn, fail } = report.summary;
  const body = report.hasWorkspace
    ? report.groups.map(groupHtml).join('\n')
    : `<p class="empty">Open a folder to run the Doctor.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1.5rem 2rem; line-height: 1.5; }
  h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
  .summary { display: flex; gap: 0.5rem; margin: 0.75rem 0 1.5rem; }
  .badge { padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
  .badge.ok { background: rgba(46, 160, 67, 0.18); color: var(--vscode-charts-green, #3fb950); }
  .badge.warn { background: rgba(210, 153, 34, 0.18); color: var(--vscode-charts-yellow, #d29922); }
  .badge.fail { background: rgba(248, 81, 73, 0.18); color: var(--vscode-charts-red, #f85149); }
  .group { margin-bottom: 1.5rem; }
  .group h2 { font-size: 1rem; margin: 0 0 0.5rem; border-bottom: 1px solid var(--vscode-panel-border, #333); padding-bottom: 0.3rem; }
  .row { display: flex; align-items: baseline; gap: 0.6rem; padding: 0.2rem 0; }
  .row .icon { width: 1.1rem; text-align: center; }
  .row .label { font-weight: 600; min-width: 9rem; }
  .row .detail { color: var(--vscode-descriptionForeground); font-size: 0.9rem; }
  .ok .icon { color: var(--vscode-charts-green, #3fb950); }
  .warn .icon { color: var(--vscode-charts-yellow, #d29922); }
  .fail .icon { color: var(--vscode-charts-red, #f85149); }
  footer { margin-top: 2rem; color: var(--vscode-descriptionForeground); font-size: 0.8rem; }
</style>
</head>
<body>
  <h1>🩺 Environment Doctor</h1>
  <div class="summary">
    <span class="badge ok">${ok} ok</span>
    <span class="badge warn">${warn} warning${warn === 1 ? '' : 's'}</span>
    <span class="badge fail">${fail} failing</span>
  </div>
  ${body}
  <footer>Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())} · CodeOpsDeck</footer>
</body>
</html>`;
}

function groupHtml(group: CheckGroup): string {
  const rows = group.items.map(rowHtml).join('\n');
  return `<section class="group"><h2>${escapeHtml(group.label)}</h2>${rows}</section>`;
}

function rowHtml(item: CheckItem): string {
  return `<div class="row ${item.status}">
    <span class="icon">${glyph(item.status)}</span>
    <span class="label">${escapeHtml(item.label)}</span>
    <span class="detail">${escapeHtml(item.detail ?? '')}</span>
  </div>`;
}

function glyph(status: CheckStatus): string {
  return status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
