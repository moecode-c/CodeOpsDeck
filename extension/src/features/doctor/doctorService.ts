import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import * as net from 'node:net';
import type { Logger } from '../../core/logger';
import { loadProjectConfig } from '../../core/configLoader';
import {
  parseEnvKeys,
  type EnvRequirement,
  type ServiceRequirement,
  type ToolRequirement,
} from '../../core/projectConfig';
import { diffEnvKeys, meetsMinVersion, parseVersionOutput, summarize } from './checks';
import type { CheckGroup, CheckItem, DoctorReport } from './types';

/** Tool/service names are only allowed to contain shell-safe characters. */
const SAFE_NAME = /^[A-Za-z0-9_.+-]+$/;

/**
 * Runs the Environment Doctor against the real machine: tool versions via
 * `execFile` (no shell — avoids injection), service reachability via TCP
 * probes, and env-var presence by diffing `.env` against the example/required.
 */
export class DoctorService {
  constructor(private readonly logger: Logger) {}

  async run(): Promise<DoctorReport> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return { groups: [], summary: { ok: 0, warn: 0, fail: 0 }, generatedAt: nowIso(), hasWorkspace: false };
    }

    const config = await loadProjectConfig(folder);
    this.logger.debug('Doctor config', config);

    const [tools, services, env] = await Promise.all([
      this.checkTools(config.doctor?.tools ?? []),
      this.checkServices(config.doctor?.services ?? []),
      this.checkEnv(folder, config.doctor?.env),
    ]);

    const groups = [tools, services, env].filter((group) => group.items.length > 0);
    return { groups, summary: summarize(groups), generatedAt: nowIso(), hasWorkspace: true };
  }

  private async checkTools(tools: ToolRequirement[]): Promise<CheckGroup> {
    const items = await Promise.all(tools.map((tool) => this.checkTool(tool)));
    return { id: 'tools', label: 'Tools', items };
  }

  private async checkTool(tool: ToolRequirement): Promise<CheckItem> {
    if (!SAFE_NAME.test(tool.name)) {
      return { id: `tool:${tool.name}`, label: tool.name, status: 'fail', detail: 'invalid tool name' };
    }
    const version = await getToolVersion(tool.name);
    const status = meetsMinVersion(version, tool.minVersion);
    const detail = version
      ? status === 'warn'
        ? `${version} — need ≥ ${tool.minVersion}`
        : version
      : 'not found';
    const item: CheckItem = { id: `tool:${tool.name}`, label: tool.name, status, detail };
    if (status === 'fail') {
      item.fix = { kind: 'openUrl', label: `Install ${tool.name}`, url: installUrl(tool.name) };
    }
    return item;
  }

  private async checkServices(services: ServiceRequirement[]): Promise<CheckGroup> {
    const items = await Promise.all(
      services.map(async (service): Promise<CheckItem> => {
        const up = await probeTcp(service.port);
        const item: CheckItem = {
          id: `svc:${service.name}:${service.port}`,
          label: service.name,
          status: up ? 'ok' : 'warn',
          detail: up ? `:${service.port} reachable` : `:${service.port} not reachable`,
        };
        if (!up) {
          item.fix = { kind: 'runCommand', label: 'docker compose up -d', command: 'docker compose up -d' };
        }
        return item;
      }),
    );
    return { id: 'services', label: 'Services', items };
  }

  private async checkEnv(folder: vscode.WorkspaceFolder, env?: EnvRequirement): Promise<CheckGroup> {
    if (!env || (!env.required?.length && !env.example)) {
      return { id: 'env', label: 'Environment', items: [] };
    }

    const envFile = env.file ?? '.env';
    const envText = await readText(folder, envFile);
    const exampleText = env.example ? await readText(folder, env.example) : undefined;
    const required = env.required?.length ? env.required : exampleText ? parseEnvKeys(exampleText) : [];
    const present = envText ? parseEnvKeys(envText) : [];

    const items: CheckItem[] = [];
    if (!envText && exampleText) {
      items.push({
        id: 'env:file',
        label: envFile,
        status: 'fail',
        detail: `missing — copy from ${env.example}`,
        fix: {
          kind: 'copyEnvExample',
          label: `Copy ${env.example} → ${envFile}`,
          args: { example: env.example, target: envFile },
        },
      });
    }
    for (const key of diffEnvKeys(required, present)) {
      items.push({ id: `env:${key}`, label: key, status: 'fail', detail: 'missing' });
    }
    if (items.length === 0 && required.length > 0) {
      items.push({ id: 'env:ok', label: `${required.length} required vars`, status: 'ok', detail: 'all present' });
    }
    return { id: 'env', label: 'Environment', items };
  }
}

function getToolVersion(name: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile(name, ['--version'], { timeout: 4000, windowsHide: true }, (err, stdout, stderr) => {
      const out = `${stdout ?? ''}\n${stderr ?? ''}`.trim();
      if (err && !out) return resolve(undefined);
      resolve(parseVersionOutput(out));
    });
  });
}

function probeTcp(port: number, host = '127.0.0.1', timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const finish = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function installUrl(name: string): string {
  switch (name) {
    case 'node':
      return 'https://nodejs.org/en/download';
    case 'docker':
      return 'https://docs.docker.com/get-docker/';
    case 'git':
      return 'https://git-scm.com/downloads';
    default:
      return `https://duckduckgo.com/?q=install+${encodeURIComponent(name)}`;
  }
}

async function readText(folder: vscode.WorkspaceFolder, name: string): Promise<string | undefined> {
  try {
    return new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder.uri, name)));
  } catch {
    return undefined;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}
