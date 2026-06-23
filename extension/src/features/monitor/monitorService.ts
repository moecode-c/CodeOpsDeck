import * as os from 'node:os';
import { cpuPercentFromSamples, ramPercent, type CpuSample } from './metrics';

export interface MetricSample {
  cpu: number; // percent
  ram: number; // percent
  ramUsedBytes: number;
  ramTotalBytes: number;
}

/**
 * Samples local CPU/RAM using Node's built-in `os` module (PLAN §6.4). CPU% is
 * derived from the delta between successive cumulative samples, so no heavy
 * `systeminformation` dependency is needed.
 */
export class MonitorService {
  private previous: CpuSample = readCpuSample();

  sample(): MetricSample {
    const current = readCpuSample();
    const cpu = cpuPercentFromSamples(this.previous, current);
    this.previous = current;

    const total = os.totalmem();
    const free = os.freemem();
    return { cpu, ram: ramPercent(total, free), ramUsedBytes: total - free, ramTotalBytes: total };
  }
}

function readCpuSample(): CpuSample {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const value of Object.values(cpu.times)) total += value;
    idle += cpu.times.idle;
  }
  return { idle, total };
}
