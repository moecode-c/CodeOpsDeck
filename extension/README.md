# CodeOpsDeck

**Your DevOps control center, inside VS Code.** Docker, health checks, environment validation, logs and GitHub — all local, no backend, no signup.

CodeOpsDeck reads your local Docker, processes, logs, env files and health endpoints directly. It is **local-first** and **zero-config**: you get value in the first 30 seconds after install.

## Features (roadmap)

| Feature | What it does | Status |
|---|---|---|
| 🩺 **Environment Doctor** | One command shows exactly what's wrong with your setup — missing tools, services, env vars — with one-click fixes. | Section 2 |
| 🐳 **Docker Control Center** | List, start/stop/restart containers; view CPU/mem; stream logs. | Section 3 |
| ❤️ **Health Checks** | Poll your endpoints; status bar summary; up/down notifications. | Section 4 |
| 📈 **Local Monitoring** | Live CPU/RAM/disk with a dashboard. | Section 4 |
| 📜 **Local Logs** | Tail, search and filter file & docker logs. | Section 5 |

> **This is an early build.** Section 1 (foundation) is in place: the extension activates lazily and shows the CodeOpsDeck sidebar; the core runtime (central scheduler, config, logging, status bar, event bus) is implemented and unit-tested. Features arrive section by section.

## Privacy

Runs locally. No telemetry by default — opt in via `codeopsdeck.telemetry.enabled` if you ever want to help guide the roadmap. CodeOpsDeck never sends data you didn't ask it to.

## Settings

| Setting | Default | Description |
|---|---|---|
| `codeopsdeck.logLevel` | `info` | Output channel verbosity. |
| `codeopsdeck.health.intervalSeconds` | `30` | Health-check poll interval. |
| `codeopsdeck.monitor.intervalSeconds` | `5` | CPU/RAM/disk sample interval. |
| `codeopsdeck.monitor.cpuThreshold` | `85` | CPU % that triggers a warning. |
| `codeopsdeck.telemetry.enabled` | `false` | Opt-in anonymous usage metrics. |

## License

MIT
