import type { FeatureContext } from '../../types';
import { registerPlaceholderView } from '../placeholder';

/** Docker Control Center — containers, stats, logs. Full implementation: Section 3. */
export function registerDocker({ context }: FeatureContext): void {
  registerPlaceholderView(context, 'codeopsdeck.docker', [
    {
      label: 'Docker Control Center',
      description: 'Section 3',
      icon: 'server-environment',
      tooltip: 'Will list containers and let you start/stop/restart and stream logs.',
    },
  ]);
}
