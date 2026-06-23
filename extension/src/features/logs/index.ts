import type { FeatureContext } from '../../types';
import { registerPlaceholderView } from '../placeholder';

/** Local Logs — tail/search/filter. Full implementation: Section 5. */
export function registerLogs({ context }: FeatureContext): void {
  registerPlaceholderView(context, 'codeopsdeck.logs', [
    {
      label: 'Local Logs',
      description: 'Section 5',
      icon: 'output',
      tooltip: 'Will tail files and docker logs with search, filter and follow.',
    },
  ]);
}
