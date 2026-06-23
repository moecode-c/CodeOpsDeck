# Changelog

All notable changes to CodeOpsDeck are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses semver.

## [0.1.0] — Local MVP

First feature-complete release: the entire local-first feature set (PLAN Phase 1).
Everything runs locally — no backend, no account, no telemetry by default.

### Added
- **Environment Doctor** ⭐ — checks required tools and versions, service ports,
  and env vars; zero-config auto-detection from `package.json`,
  `docker-compose.yml` and `.env.example`; a shareable report webview; and
  one-click fixes (copy `.env`, open install pages, `docker compose up`).
- **Docker Control Center** — container list with live CPU/memory, start / stop /
  restart / remove, and streaming logs; graceful degradation when the Docker
  engine isn't running.
- **Health Checks** — endpoint polling with latency, a status-bar summary, and
  up/down transition notifications.
- **Local Monitoring** — CPU/RAM in the status bar plus a live sparkline
  dashboard, built on Node's `os` module (no heavy dependencies).
- **Local Logs** — a Log Viewer webview with search, level filter, follow and
  save; file tailing backed by a capped ring buffer.
- **Foundation** — a single focus-aware scheduler, typed event bus, leveled
  logger, settings + `.codeopsdeck.json` config layer, lazy activation,
  GitHub Actions CI, and 61 unit tests.
