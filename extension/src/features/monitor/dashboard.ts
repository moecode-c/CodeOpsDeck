/**
 * Live monitoring dashboard webview (PLAN §6.4): two sparklines (CPU, memory)
 * fed by `postMessage`. Scripts run under a nonce + strict CSP.
 */
export function buildDashboardHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1.5rem 2rem; }
  h1 { font-size: 1.3rem; margin: 0 0 1rem; }
  .metric { margin-bottom: 1.75rem; }
  .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem; }
  .head .name { font-weight: 600; }
  .head .value { font-variant-numeric: tabular-nums; font-size: 1.1rem; }
  canvas { width: 100%; height: 80px; display: block; background: var(--vscode-editorWidget-background, rgba(127,127,127,0.08)); border-radius: 6px; }
  .hint { color: var(--vscode-descriptionForeground); font-size: 0.85rem; margin-top: 1rem; }
</style>
</head>
<body>
  <h1>📈 Local Monitoring</h1>
  <div class="metric">
    <div class="head"><span class="name">CPU</span><span class="value" id="cpuVal">–</span></div>
    <canvas id="cpu" width="600" height="80"></canvas>
  </div>
  <div class="metric">
    <div class="head"><span class="name">Memory</span><span class="value" id="ramVal">–</span></div>
    <canvas id="ram" width="600" height="80"></canvas>
  </div>
  <p class="hint">Live, local, sampled in the editor. No data leaves your machine.</p>
  <script nonce="${nonce}">
    const MAX = 60;
    const series = { cpu: [], ram: [] };

    function push(arr, value) {
      arr.push(value);
      if (arr.length > MAX) arr.shift();
    }

    function draw(id, data, color) {
      const canvas = document.getElementById(id);
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (data.length < 2) return;
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      const step = w / (MAX - 1);
      data.forEach((v, i) => {
        const x = i * step;
        const y = h - (Math.max(0, Math.min(100, v)) / 100) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    window.addEventListener('message', (event) => {
      const m = event.data;
      if (!m || m.type !== 'sample') return;
      push(series.cpu, m.cpu);
      push(series.ram, m.ram);
      document.getElementById('cpuVal').textContent = m.cpu.toFixed(0) + '%';
      document.getElementById('ramVal').textContent = m.ram.toFixed(0) + '%  (' + m.ramUsed + ' / ' + m.ramTotal + ')';
      draw('cpu', series.cpu, '#3fb950');
      draw('ram', series.ram, '#58a6ff');
    });
  </script>
</body>
</html>`;
}

export function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 24; i++) nonce += chars[Math.floor(Math.random() * chars.length)];
  return nonce;
}
