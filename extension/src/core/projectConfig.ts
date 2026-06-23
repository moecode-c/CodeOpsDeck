/**
 * Pure parsing + zero-config auto-detection for the workspace `.codeopsdeck.json`
 * (PLAN §5). Kept free of any `vscode` import so the logic is unit-testable.
 *
 * Includes docker-compose service/port detection (added with the Environment
 * Doctor). Kept free of any `vscode` import so the logic is unit-testable.
 */

import { parse as parseYaml } from 'yaml';

export interface ToolRequirement {
  name: string;
  minVersion?: string;
}

export interface ServiceRequirement {
  name: string;
  port: number;
}

export interface EnvRequirement {
  file?: string;
  example?: string;
  required?: string[];
}

export interface DoctorConfig {
  tools?: ToolRequirement[];
  services?: ServiceRequirement[];
  env?: EnvRequirement;
}

export interface HealthCheckDef {
  name: string;
  url: string;
}

export interface LogSourceDef {
  name: string;
  path: string;
}

export interface ProjectConfig {
  doctor?: DoctorConfig;
  healthChecks?: HealthCheckDef[];
  logs?: LogSourceDef[];
}

/** Parse the raw contents of `.codeopsdeck.json`. Throws on invalid JSON/shape. */
export function parseProjectConfig(raw: string): ProjectConfig {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('.codeopsdeck.json must contain a JSON object');
  }
  return value as ProjectConfig;
}

/** Extract variable names from a `.env`/`.env.example` file body. */
export function parseEnvKeys(content: string): string[] {
  const keys: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const withoutExport = line.startsWith('export ') ? line.slice('export '.length) : line;
    const eq = withoutExport.indexOf('=');
    const key = (eq === -1 ? withoutExport : withoutExport.slice(0, eq)).trim();
    if (key) keys.push(key);
  }
  return keys;
}

/** Derive a minimal Doctor config from a `package.json` body (zero-config path). */
export function autoDetectFromPackageJson(raw: string): ProjectConfig {
  const tools: ToolRequirement[] = [];
  try {
    const pkg = JSON.parse(raw) as { engines?: Record<string, string> };
    const nodeRange = pkg.engines?.node;
    if (nodeRange) {
      const minVersion = extractMinVersion(nodeRange);
      tools.push(minVersion ? { name: 'node', minVersion } : { name: 'node' });
    }
  } catch {
    // Unreadable package.json contributes nothing — that's fine for auto-detect.
  }
  return { doctor: { tools } };
}

/** Shallow-merge two configs, with `override` winning per top-level section. */
export function mergeConfigs(base: ProjectConfig, override: ProjectConfig): ProjectConfig {
  return {
    doctor: override.doctor ?? base.doctor,
    healthChecks: override.healthChecks ?? base.healthChecks,
    logs: override.logs ?? base.logs,
  };
}

function extractMinVersion(range: string): string | undefined {
  const match = range.match(/\d+(?:\.\d+){0,2}/);
  return match?.[0];
}

/** Detect services + their published host ports from a docker-compose file. */
export function autoDetectFromCompose(content: string): ServiceRequirement[] {
  let doc: unknown;
  try {
    doc = parseYaml(content);
  } catch {
    return [];
  }
  const services = (doc as { services?: Record<string, unknown> })?.services;
  if (!services || typeof services !== 'object') return [];

  const result: ServiceRequirement[] = [];
  for (const [name, raw] of Object.entries(services)) {
    const port = firstPublishedPort((raw as { ports?: unknown })?.ports);
    if (port !== undefined) result.push({ name, port });
  }
  return result;
}

function firstPublishedPort(ports: unknown): number | undefined {
  if (!Array.isArray(ports)) return undefined;
  for (const entry of ports) {
    if (typeof entry === 'number') return entry;
    if (typeof entry === 'string') {
      // Forms: "host:container", "ip:host:container", or just "container".
      const parts = entry.split(':');
      const host = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      const port = Number.parseInt(host, 10);
      if (!Number.isNaN(port)) return port;
    } else if (entry && typeof entry === 'object' && 'published' in entry) {
      const port = Number.parseInt(String((entry as { published: unknown }).published), 10);
      if (!Number.isNaN(port)) return port;
    }
  }
  return undefined;
}
