import type * as vscode from 'vscode';

/**
 * The single sidebar webview (icon-navbar redesign). A top row of icons routes
 * between the five features; the content area renders state pushed from the
 * extension. All data/logic still lives in the feature services — this is pure
 * presentation. Scripts run under a nonce + strict CSP.
 */

const ICONS: Record<string, string> = {
  doctor:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3l2 5 4-10 2 5h4"/></svg>',
  docker:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5"/><path d="M12 12v9"/></svg>',
  health:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-6-4-8.5-8A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 5C18 16 12 20 12 20z"/></svg>',
  monitor:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 19v-4"/><path d="M13 19V9"/><path d="M18 19v-7"/></svg>',
  logs:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>',
};

export function buildMainHtml(webview: vscode.Webview, nonce: string): string {
  const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';`;
  const navButton = (feat: string, label: string) =>
    `<button data-feat="${feat}" title="${label}" aria-label="${label}">${ICONS[feat]}</button>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<style nonce="${nonce}">
  body { margin: 0; padding: 0; color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: 13px; }
  .nav { display: flex; gap: 4px; padding: 6px; border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,.3)); position: sticky; top: 0; background: var(--vscode-sideBar-background); z-index: 1; }
  .nav button { flex: 1; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--vscode-descriptionForeground); padding: 7px 0; border-radius: 6px; cursor: pointer; }
  .nav button:hover { background: var(--vscode-toolbar-hoverBackground, rgba(128,128,128,.15)); color: var(--vscode-foreground); }
  .nav button.active { background: var(--vscode-list-activeSelectionBackground, rgba(64,128,255,.25)); color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground)); }
  #content { padding: 10px 12px; }
  .fh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 8px; }
  .ft { font-weight: 600; }
  .fb { display: flex; flex-wrap: wrap; justify-content: flex-end; }
  .tb { background: var(--vscode-button-secondaryBackground, #3a3d41); color: var(--vscode-button-secondaryForeground, #fff); border: none; padding: 3px 8px; margin-left: 4px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .tb:hover { background: var(--vscode-button-hoverBackground, #45494e); }
  .tb.danger:hover { background: var(--vscode-inputValidation-errorBackground, #5a1d1d); }
  .group { margin-bottom: 14px; }
  .gh { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
  .row { display: flex; align-items: center; gap: 8px; padding: 3px 4px; border-radius: 4px; }
  .row.fixable, .row.link { cursor: pointer; }
  .row.fixable:hover, .row.link:hover { background: var(--vscode-list-hoverBackground, rgba(128,128,128,.12)); }
  .lbl { font-weight: 500; }
  .det { margin-left: auto; color: var(--vscode-descriptionForeground); font-size: 12px; text-align: right; }
  .st { width: 16px; text-align: center; flex: 0 0 auto; }
  .st.ok { color: #3fb950; } .st.warn { color: #d2a429; } .st.fail { color: #f25555; }
  .muted { color: var(--vscode-descriptionForeground); padding: 8px 0; line-height: 1.7; }
  .card { border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.25)); border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .crow { display: flex; align-items: center; gap: 8px; }
  .acts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .acts .tb { margin-left: 0; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #888; display: inline-block; flex: 0 0 auto; }
  .dot.running { background: #3fb950; } .dot.paused, .dot.restarting { background: #d2a429; }
  .mblock { margin-bottom: 16px; }
  .mh { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .mv { font-variant-numeric: tabular-nums; }
  canvas { width: 100%; height: 56px; background: var(--vscode-editorWidget-background, rgba(128,128,128,.08)); border-radius: 4px; display: block; }
  .nav svg { display: block; }
</style>
</head>
<body>
  <div class="nav">
    ${navButton('doctor', 'Doctor')}
    ${navButton('docker', 'Docker')}
    ${navButton('health', 'Health')}
    ${navButton('monitor', 'Monitor')}
    ${navButton('logs', 'Logs')}
  </div>
  <div id="content"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let active = 'doctor';
    const state = { doctor: { loading: true }, docker: null, health: null, logs: null };
    const hist = { cpu: [], ram: [] };
    let monitor = null;

    function send(action, payload) { vscode.postMessage({ type: 'action', action: action, payload: payload }); }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function push(a, v) { a.push(v); if (a.length > 60) a.shift(); }
    function glyph(s) { return s === 'ok' ? '\\u2713' : s === 'warn' ? '\\u26a0' : '\\u2717'; }
    function header(title, btns) { return '<div class="fh"><span class="ft">' + esc(title) + '</span><span class="fb">' + (btns || '') + '</span></div>'; }

    const buttons = Array.prototype.slice.call(document.querySelectorAll('.nav button'));
    buttons.forEach(function (b) { b.addEventListener('click', function () { setActive(b.getAttribute('data-feat')); }); });
    function setActive(f) { active = f; buttons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-feat') === f); }); render(); }

    window.addEventListener('message', function (e) {
      const m = e.data; if (!m) return;
      if (m.type === 'monitor') { monitor = m.sample; push(hist.cpu, m.sample.cpu); push(hist.ram, m.sample.ram); if (active === 'monitor') drawMonitor(); return; }
      if (m.type === 'doctor') state.doctor = m.report;
      else if (m.type === 'docker') state.docker = m;
      else if (m.type === 'health') state.health = m;
      else if (m.type === 'logs') state.logs = m;
      if (active === m.type) render();
    });

    function render() {
      const el = document.getElementById('content');
      if (active === 'doctor') el.innerHTML = renderDoctor();
      else if (active === 'docker') el.innerHTML = renderDocker();
      else if (active === 'health') el.innerHTML = renderHealth();
      else if (active === 'monitor') { el.innerHTML = renderMonitor(); drawMonitor(); }
      else if (active === 'logs') el.innerHTML = renderLogs();
      bindActions();
    }

    function bindActions() {
      Array.prototype.slice.call(document.querySelectorAll('[data-act]')).forEach(function (elm) {
        elm.addEventListener('click', function () {
          const a = elm.getAttribute('data-act');
          if (a === 'doctor.fix') {
            const g = +elm.getAttribute('data-gi'), i = +elm.getAttribute('data-ii');
            const fix = state.doctor && state.doctor.groups && state.doctor.groups[g] && state.doctor.groups[g].items[i] && state.doctor.groups[g].items[i].fix;
            if (fix) send('doctor.fix', fix);
          } else if (a === 'logs.open') {
            const i = +elm.getAttribute('data-li');
            const s = state.logs && state.logs.sources && state.logs.sources[i];
            if (s) send('logs.open', s);
          } else if (elm.getAttribute('data-id')) {
            send(a, { id: elm.getAttribute('data-id') });
          } else { send(a); }
        });
      });
    }

    function renderDoctor() {
      const r = state.doctor; let body;
      if (!r || r.loading) body = '<div class="muted">Running diagnostics\\u2026</div>';
      else if (!r.hasWorkspace) body = '<div class="muted">Open a folder to run the Doctor.</div>';
      else if (!r.groups.length) body = '<div class="muted">Nothing to check yet.</div>';
      else body = r.groups.map(function (g, gi) {
        return '<div class="group"><div class="gh">' + esc(g.label) + '</div>' + g.items.map(function (it, ii) {
          const attrs = it.fix ? (' class="row fixable ' + it.status + '" data-act="doctor.fix" data-gi="' + gi + '" data-ii="' + ii + '"') : (' class="row ' + it.status + '"');
          return '<div' + attrs + '><span class="st ' + it.status + '">' + glyph(it.status) + '</span><span class="lbl">' + esc(it.label) + '</span><span class="det">' + esc(it.detail || '') + '</span></div>';
        }).join('') + '</div>';
      }).join('');
      return header('Environment Doctor', '<button class="tb" data-act="doctor.refresh">Refresh</button><button class="tb" data-act="doctor.report">Report</button>') + body;
    }

    function renderDocker() {
      const d = state.docker; let body;
      if (!d) body = '<div class="muted">Connecting to Docker\\u2026</div>';
      else if (!d.available) body = '<div class="muted">' + esc(d.reason || 'Docker not available') + '</div>';
      else if (!d.containers.length) body = '<div class="muted">No containers.</div>';
      else body = d.containers.map(function (c) {
        const acts = (c.state === 'running'
          ? '<button class="tb" data-act="docker.stop" data-id="' + c.id + '">Stop</button><button class="tb" data-act="docker.restart" data-id="' + c.id + '">Restart</button>'
          : '<button class="tb" data-act="docker.start" data-id="' + c.id + '">Start</button>')
          + '<button class="tb" data-act="docker.logs" data-id="' + c.id + '">Logs</button><button class="tb danger" data-act="docker.remove" data-id="' + c.id + '">Remove</button>';
        return '<div class="card"><div class="crow"><span class="dot ' + esc(c.state) + '"></span><span class="lbl">' + esc(c.name) + '</span><span class="det">' + esc(c.detail || '') + '</span></div><div class="acts">' + acts + '</div></div>';
      }).join('');
      return header('Docker', '<button class="tb" data-act="docker.refresh">Refresh</button>') + body;
    }

    function renderHealth() {
      const h = state.health; let body;
      if (!h) body = '<div class="muted">Loading\\u2026</div>';
      else if (!h.configured) body = '<div class="muted">No health checks configured.<br>Add a "healthChecks" array to .codeopsdeck.json</div>';
      else if (!h.results.length) body = '<div class="muted">No endpoints.</div>';
      else body = h.results.map(function (r) {
        const st = r.up ? 'ok' : 'fail';
        return '<div class="row ' + st + '"><span class="st ' + st + '">' + (r.up ? '\\u2713' : '\\u2717') + '</span><span class="lbl">' + esc(r.name) + '</span><span class="det">' + esc(r.detail || '') + '</span></div>';
      }).join('');
      return header('Health checks', '<button class="tb" data-act="health.refresh">Refresh</button>') + body;
    }

    function renderMonitor() {
      const cpu = monitor ? Math.round(monitor.cpu) + '%' : '\\u2013';
      const ram = monitor ? Math.round(monitor.ram) + '% \\u00b7 ' + esc(monitor.ramUsed) + ' / ' + esc(monitor.ramTotal) : '\\u2013';
      return header('Monitoring', '<button class="tb" data-act="monitor.dashboard">Dashboard</button>')
        + '<div class="mblock"><div class="mh"><span>CPU</span><span class="mv" id="cpuVal">' + cpu + '</span></div><canvas id="cpuC" height="56"></canvas></div>'
        + '<div class="mblock"><div class="mh"><span>Memory</span><span class="mv" id="ramVal">' + ram + '</span></div><canvas id="ramC" height="56"></canvas></div>';
    }

    function drawMonitor() {
      const cv = document.getElementById('cpuVal'), rv = document.getElementById('ramVal');
      if (monitor) { if (cv) cv.textContent = Math.round(monitor.cpu) + '%'; if (rv) rv.textContent = Math.round(monitor.ram) + '% \\u00b7 ' + monitor.ramUsed + ' / ' + monitor.ramTotal; }
      spark('cpuC', hist.cpu, '#3fb950'); spark('ramC', hist.ram, '#4aa3ff');
    }

    function spark(id, data, color) {
      const c = document.getElementById(id); if (!c) return;
      const w = c.clientWidth || 280; c.width = w; const h = c.height;
      const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
      if (data.length < 2) return;
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = color;
      const step = w / 59;
      data.forEach(function (v, i) { const x = i * step, y = h - (Math.max(0, Math.min(100, v)) / 100) * h; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
    }

    function renderLogs() {
      const l = state.logs; let body;
      if (!l) body = '<div class="muted">Loading\\u2026</div>';
      else if (!l.sources.length) body = '<div class="muted">No log sources configured.<br>Add a "logs" array to .codeopsdeck.json</div>';
      else body = l.sources.map(function (s, i) {
        return '<div class="row link" data-act="logs.open" data-li="' + i + '"><span class="st">\\u25b8</span><span class="lbl">' + esc(s.name) + '</span><span class="det">' + esc(s.path) + '</span></div>';
      }).join('');
      return header('Logs', '<button class="tb" data-act="logs.refresh">Refresh</button>') + body;
    }

    setActive('doctor');
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}
