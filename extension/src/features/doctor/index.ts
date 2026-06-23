import type { FeatureContext } from '../../types';
import { registerPlaceholderView } from '../placeholder';

/** Environment Doctor ⭐ — the hero feature. Full implementation: Section 2. */
export function registerDoctor({ context }: FeatureContext): void {
  registerPlaceholderView(context, 'codeopsdeck.doctor', [
    {
      label: 'Environment Doctor',
      description: 'Section 2',
      icon: 'pulse',
      tooltip: 'Will check tools, services, env vars and docker-compose, with one-click fixes.',
    },
  ]);
}
