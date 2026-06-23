# Changelog

All notable changes to CodeOpsDeck are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses semver.

## [Unreleased]

### Added — Section 1: Foundation
- Monorepo scaffold with the `extension/` package, esbuild bundling, and the
  TypeScript / ESLint / Vitest toolchain.
- Core runtime: central `Scheduler` (focus-aware backoff), typed `EventBus`,
  leveled `Logger`, `StatusBarManager`, and the settings/`.codeopsdeck.json`
  config readers.
- Activity-bar container with the Doctor / Docker / Health / Monitor / Logs
  views, lazy activation, and a root status-bar entry.
- Unit tests for the scheduler, event bus and config parsing; GitHub Actions CI
  (lint, typecheck, test, build).
