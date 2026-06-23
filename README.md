# CodeOpsDeck

> **A local-first DevOps control center for VS Code.** Monitor, debug and manage your apps without leaving your editor. Zero-config. Free and open source (MIT).

CodeOpsDeck reads your local Docker, processes, logs, env files and health endpoints directly — no backend, no signup. An optional cloud layer (multi-server monitoring, deploy history, alerts) can be bolted on later, but local mode is always the default and never depends on it.

## Repository layout

```
CodeOpsDeck/
├── extension/          # the VS Code extension (the only package built for v1)
│   ├── src/
│   │   ├── core/       # scheduler, config, logger, statusBar, events
│   │   ├── features/   # doctor, docker, health, monitor, logs
│   │   └── types/
│   └── package.json
├── .github/workflows/  # CI: lint, typecheck, test, build
└── package.json        # npm workspaces root
```

It's a monorepo from day one (room for `agent/` and `backend/` in the cloud phase) but v1 only builds `extension/`.

## Develop

```bash
npm install            # install workspace dev dependencies
npm run build          # bundle the extension to extension/dist
npm test               # run unit tests (Vitest)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
```

Then press **F5** in VS Code (the "Run CodeOpsDeck" launch config) to open an Extension Development Host with CodeOpsDeck loaded. Open the CodeOpsDeck icon in the activity bar to see the sidebar.

## Status

**Local MVP complete (v0.1.0).** All five sections shipped:

1. ✅ **Foundation** — monorepo, build/test/CI, core runtime, activating sidebar.
2. ✅ **Environment Doctor** (hero) — tools/services/env/compose checks, report, fixes.
3. ✅ **Docker Control Center** — container list, controls, live stats, log streaming.
4. ✅ **Health Checks + Local Monitoring** — endpoint polling + CPU/RAM dashboard.
5. ✅ **Local Logs** — Log Viewer with search/filter/follow/save + file tailing.

61 unit tests · 733 KB bundle · zero telemetry by default.

## License

[MIT](LICENSE)
