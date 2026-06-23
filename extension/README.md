# CodeOpsDeck

**Your DevOps control center, inside VS Code.** Docker, health checks, environment validation, logs and monitoring — all local, no backend, no signup.

CodeOpsDeck reads your local Docker, processes, logs, env files and health endpoints directly. It is **local-first** and **zero-config**: you get value in the first 30 seconds after install.

## Features

| Feature | What it does |
|---|---|
| 🩺 **Environment Doctor** | One view shows exactly what's wrong with your setup — missing tools, wrong versions, services down, missing env vars — with one-click fixes and a shareable report. |
| 🐳 **Docker Control Center** | List containers with live CPU/memory, start/stop/restart/remove, and stream logs. |
| ❤️ **Health Checks** | Poll your endpoints; status-bar summary (`♥ 3/4 healthy`) and up/down notifications. |
| 📈 **Local Monitoring** | Live CPU/RAM in the status bar and a sparkline dashboard. |
| 📜 **Local Logs** | Tail files in a Log Viewer with search, level filter, follow and save. |

## Zero-config & `.codeopsdeck.json`

CodeOpsDeck works immediately by auto-detecting requirements from `package.json`, `docker-compose.yml` and `.env.example`. Commit a `.codeopsdeck.json` to make a project's requirements explicit so every teammate's Doctor knows them instantly:

```jsonc
{
  "doctor": {
    "tools": [{ "name": "node", "minVersion": "18.0.0" }, { "name": "docker" }],
    "services": [{ "name": "PostgreSQL", "port": 5432 }],
    "env": { "file": ".env", "example": ".env.example", "required": ["DATABASE_URL"] }
  },
  "healthChecks": [{ "name": "API", "url": "http://localhost:3000/api/health" }],
  "logs": [{ "name": "app", "path": "logs/app.log" }]
}
```

## Privacy

Runs locally. No telemetry by default — opt in via `codeopsdeck.telemetry.enabled` if you ever want to help guide the roadmap. CodeOpsDeck never sends data you didn't ask it to.

## Settings

| Setting | Default | Description |
|---|---|---|
| `codeopsdeck.logLevel` | `info` | Output channel verbosity. |
| `codeopsdeck.health.intervalSeconds` | `30` | Health-check poll interval. |
| `codeopsdeck.monitor.intervalSeconds` | `5` | CPU/RAM sample interval. |
| `codeopsdeck.monitor.cpuThreshold` | `85` | CPU % that triggers a warning. |
| `codeopsdeck.docker.intervalSeconds` | `4` | Container list/stats refresh interval. |
| `codeopsdeck.telemetry.enabled` | `false` | Opt-in anonymous usage metrics. |

## License

MIT
