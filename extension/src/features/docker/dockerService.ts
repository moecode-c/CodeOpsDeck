import Docker from 'dockerode';
import { Writable } from 'node:stream';
import type { Logger } from '../../core/logger';
import { calcCpuPercent, calcMemoryUsedBytes, type DockerStatsSample } from './stats';

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  state: string; // 'running' | 'exited' | 'paused' | ...
  status: string; // human-readable, e.g. "Up 2 hours"
  ports: string;
}

export interface ContainerStats {
  cpu: number; // percent
  memUsed: number; // bytes
  memLimit: number; // bytes
}

export interface DockerAvailability {
  available: boolean;
  reason?: string;
}

/**
 * Thin wrapper over dockerode (PLAN §6.2). Auto-connects to the local Docker
 * Engine — Unix socket on macOS/Linux, named pipe on Windows — so there is no
 * configuration. Every call is failure-tolerant; a down daemon never throws
 * into the UI.
 */
export class DockerService {
  private readonly docker = new Docker();

  constructor(private readonly logger: Logger) {}

  async ping(): Promise<DockerAvailability> {
    try {
      await this.docker.ping();
      return { available: true };
    } catch (err) {
      return { available: false, reason: describeDockerError(err) };
    }
  }

  async listContainers(): Promise<ContainerSummary[]> {
    const infos = await this.docker.listContainers({ all: true });
    return infos.map(toSummary).sort(byRunningThenName);
  }

  start(id: string): Promise<unknown> {
    return this.docker.getContainer(id).start();
  }
  stop(id: string): Promise<unknown> {
    return this.docker.getContainer(id).stop();
  }
  restart(id: string): Promise<unknown> {
    return this.docker.getContainer(id).restart();
  }
  remove(id: string): Promise<unknown> {
    return this.docker.getContainer(id).remove({ force: true });
  }

  async stats(id: string): Promise<ContainerStats | undefined> {
    try {
      const raw = (await this.docker.getContainer(id).stats({ stream: false })) as unknown as DockerStatsSample;
      return {
        cpu: calcCpuPercent(raw),
        memUsed: calcMemoryUsedBytes(raw),
        memLimit: raw.memory_stats?.limit ?? 0,
      };
    } catch (err) {
      this.logger.debug(`stats failed for ${id}`, err);
      return undefined;
    }
  }

  /** Follow a container's logs, pushing decoded text to `append`. Returns a stop fn. */
  async streamLogs(id: string, append: (text: string) => void): Promise<() => void> {
    const container = this.docker.getContainer(id);
    const stream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 200,
      timestamps: false,
    })) as unknown as NodeJS.ReadableStream;

    const sink = () =>
      new Writable({
        write(chunk: Buffer, _enc, cb) {
          append(chunk.toString('utf8'));
          cb();
        },
      });

    // Docker multiplexes stdout/stderr into one stream; demux strips the frame headers.
    this.docker.modem.demuxStream(stream, sink(), sink());

    return () => {
      try {
        (stream as unknown as { destroy?: () => void }).destroy?.();
      } catch {
        // already closed
      }
    };
  }
}

function toSummary(info: Docker.ContainerInfo): ContainerSummary {
  return {
    id: info.Id,
    name: (info.Names?.[0] ?? info.Id).replace(/^\//, ''),
    image: info.Image,
    state: info.State,
    status: info.Status,
    ports: formatPorts(info.Ports),
  };
}

function formatPorts(ports: Docker.Port[] | undefined): string {
  if (!ports?.length) return '';
  const published = ports
    .filter((p) => p.PublicPort)
    .map((p) => `${p.PublicPort}→${p.PrivatePort}`);
  return [...new Set(published)].join(', ');
}

function byRunningThenName(a: ContainerSummary, b: ContainerSummary): number {
  if (a.state === 'running' && b.state !== 'running') return -1;
  if (b.state === 'running' && a.state !== 'running') return 1;
  return a.name.localeCompare(b.name);
}

function describeDockerError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code === 'ENOENT') return 'Docker not found — is Docker Desktop running?';
  if (code === 'EACCES') return 'Permission denied accessing the Docker socket.';
  if (code === 'ECONNREFUSED') return 'Docker engine is not responding — is it running?';
  return (err as Error)?.message ?? 'Docker is not reachable';
}
