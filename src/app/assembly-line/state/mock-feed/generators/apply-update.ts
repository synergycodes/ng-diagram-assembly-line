import type { Update } from '../../../model';
import type { ProductionState } from '../mock-feed-types';

export function applyUpdate(state: ProductionState, update: Update): void {
  const node = state[update.nodeId];
  if (!node) {
    return;
  }
  node.data.status = update.status;
  Object.assign(node.data, update.metrics);
}
