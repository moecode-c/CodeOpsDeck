/**
 * Pure helpers for turning a Docker `stats` sample into CPU% and memory usage.
 * No `dockerode`/`vscode` import, so the math is unit-testable in isolation.
 * Formula matches the Docker CLI's own percentage calculation.
 */

interface CpuStats {
  cpu_usage?: { total_usage?: number; percpu_usage?: number[] };
  system_cpu_usage?: number;
  online_cpus?: number;
}

export interface DockerStatsSample {
  cpu_stats?: CpuStats;
  precpu_stats?: CpuStats;
  memory_stats?: { usage?: number; limit?: number; stats?: { cache?: number; inactive_file?: number } };
}

export function calcCpuPercent(stats: DockerStatsSample): number {
  const cpu = stats.cpu_stats;
  const pre = stats.precpu_stats;
  const cpuDelta = (cpu?.cpu_usage?.total_usage ?? 0) - (pre?.cpu_usage?.total_usage ?? 0);
  const systemDelta = (cpu?.system_cpu_usage ?? 0) - (pre?.system_cpu_usage ?? 0);
  const onlineCpus = cpu?.online_cpus ?? cpu?.cpu_usage?.percpu_usage?.length ?? 1;
  if (cpuDelta > 0 && systemDelta > 0) {
    return (cpuDelta / systemDelta) * onlineCpus * 100;
  }
  return 0;
}

export function calcMemoryUsedBytes(stats: DockerStatsSample): number {
  const mem = stats.memory_stats;
  const usage = mem?.usage ?? 0;
  // cgroup v1 reports `cache`; v2 uses `inactive_file`. Subtract whichever exists.
  const cache = mem?.stats?.cache ?? mem?.stats?.inactive_file ?? 0;
  return Math.max(0, usage - cache);
}

export function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
