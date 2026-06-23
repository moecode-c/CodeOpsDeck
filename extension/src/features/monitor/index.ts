import type { FeatureContext } from '../../types';
import { registerPlaceholderView } from '../placeholder';

/** Local Monitoring — CPU/RAM/disk dashboard. Full implementation: Section 4. */
export function registerMonitor({ context }: FeatureContext): void {
  registerPlaceholderView(context, 'codeopsdeck.monitor', [
    {
      label: 'Local Monitoring',
      description: 'Section 4',
      icon: 'graph',
      tooltip: 'Will sample CPU/RAM/disk and show live sparklines in a dashboard.',
    },
  ]);
}
