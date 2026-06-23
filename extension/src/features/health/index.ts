import type { FeatureContext } from '../../types';
import { registerPlaceholderView } from '../placeholder';

/** Health Checks — endpoint polling + status bar. Full implementation: Section 4. */
export function registerHealth({ context }: FeatureContext): void {
  registerPlaceholderView(context, 'codeopsdeck.health', [
    {
      label: 'Health Checks',
      description: 'Section 4',
      icon: 'heart',
      tooltip: 'Will poll your endpoints and surface up/down status with latency.',
    },
  ]);
}
