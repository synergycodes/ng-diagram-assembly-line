import type { ProductionState, Update } from '../../../model';

export function applyUpdate(state: ProductionState, update: Update): void {
  const module = state[update.moduleId];
  if (!module) {
    return;
  }
  module.status = update.moduleStatus;
  Object.assign(module, update.state);
}
