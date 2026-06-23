import * as vscode from 'vscode';
import {
  autoDetectFromCompose,
  autoDetectFromPackageJson,
  mergeConfigs,
  parseEnvKeys,
  parseProjectConfig,
  type HealthCheckDef,
  type LogSourceDef,
  type ProjectConfig,
  type ServiceRequirement,
  type ToolRequirement,
} from './projectConfig';

/**
 * Loads the effective project config for a workspace folder (PLAN §5): the
 * committed `.codeopsdeck.json` layered over zero-config auto-detection, so the
 * Doctor gives value before anyone writes any config.
 */

const decoder = new TextDecoder();

export async function loadProjectConfig(folder: vscode.WorkspaceFolder): Promise<ProjectConfig> {
  const detected = await autoDetect(folder);
  const explicitRaw = await readText(folder, '.codeopsdeck.json');
  if (!explicitRaw) return detected;
  try {
    return mergeConfigs(detected, parseProjectConfig(explicitRaw));
  } catch {
    // A malformed .codeopsdeck.json shouldn't break the Doctor — fall back.
    return detected;
  }
}

/** Read just the `healthChecks` from `.codeopsdeck.json` (used by the poller). */
export async function loadHealthChecks(folder: vscode.WorkspaceFolder): Promise<HealthCheckDef[]> {
  const raw = await readText(folder, '.codeopsdeck.json');
  if (!raw) return [];
  try {
    return parseProjectConfig(raw).healthChecks ?? [];
  } catch {
    return [];
  }
}

/** Read just the `logs` sources from `.codeopsdeck.json`. */
export async function loadLogSources(folder: vscode.WorkspaceFolder): Promise<LogSourceDef[]> {
  const raw = await readText(folder, '.codeopsdeck.json');
  if (!raw) return [];
  try {
    return parseProjectConfig(raw).logs ?? [];
  } catch {
    return [];
  }
}

async function autoDetect(folder: vscode.WorkspaceFolder): Promise<ProjectConfig> {
  const [pkg, compose, composeAlt, envExample] = await Promise.all([
    readText(folder, 'package.json'),
    readText(folder, 'docker-compose.yml'),
    readText(folder, 'compose.yml'),
    readText(folder, '.env.example'),
  ]);

  const composeText = compose ?? composeAlt;

  const tools: ToolRequirement[] = [];
  if (pkg) tools.push(...(autoDetectFromPackageJson(pkg).doctor?.tools ?? []));
  if (pkg && !tools.some((t) => t.name === 'node')) tools.push({ name: 'node' });
  tools.push({ name: 'git' });
  if (composeText) tools.push({ name: 'docker' });

  const services: ServiceRequirement[] = composeText ? autoDetectFromCompose(composeText) : [];

  const env = envExample
    ? { file: '.env', example: '.env.example', required: parseEnvKeys(envExample) }
    : undefined;

  return { doctor: { tools: dedupeTools(tools), services, env } };
}

function dedupeTools(tools: ToolRequirement[]): ToolRequirement[] {
  const seen = new Map<string, ToolRequirement>();
  for (const tool of tools) {
    if (!seen.has(tool.name)) seen.set(tool.name, tool);
  }
  return [...seen.values()];
}

async function readText(folder: vscode.WorkspaceFolder, name: string): Promise<string | undefined> {
  try {
    return decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder.uri, name)));
  } catch {
    return undefined;
  }
}
