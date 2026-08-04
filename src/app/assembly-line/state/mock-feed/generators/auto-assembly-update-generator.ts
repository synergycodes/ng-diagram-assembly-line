import { NODE_TYPES, type AutoAssemblyNodeData } from '../../../model';
import { NodeUpdateGenerator, randomDrain } from './node-update-generator';

const REFILL_PARTS_REMAINING = 200;
const REFILL_NEXT_REFILL_MIN = 30;

export class AutoAssemblyUpdateGenerator extends NodeUpdateGenerator<AutoAssemblyNodeData> {
  protected readonly type = NODE_TYPES.AUTO_ASSEMBLY;
  protected readonly fields = [
    'partsRemaining',
    'partsToLoad',
    'cycleTimeSec',
    'nextRefillMin',
    'manualWorkers',
    'inspectionTimeMin',
  ] as const;

  protected override computeNext(
    data: AutoAssemblyNodeData,
    field: string,
    current: number,
  ): number {
    // Parts drain down as they're consumed, then a refill tops the bin back up.
    if (field === 'partsRemaining') {
      return randomDrain(current, 20, REFILL_PARTS_REMAINING, 3);
    }
    // Minutes counting down to the next refill, resetting after it happens.
    if (field === 'nextRefillMin') {
      return randomDrain(current, 0, REFILL_NEXT_REFILL_MIN, 1);
    }
    // partsToLoad / cycleTimeSec / manualWorkers / inspectionTimeMin are gauges.
    return super.computeNext(data, field, current);
  }
}
