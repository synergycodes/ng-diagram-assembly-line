import { NODE_TYPES, type WeldingCellNodeData } from '../../../model';
import { NodeUpdateGenerator, jitter, randomIncrement } from './node-update-generator';

export class WeldingCellUpdateGenerator extends NodeUpdateGenerator<WeldingCellNodeData> {
  protected readonly type = NODE_TYPES.WELDING_CELL;
  protected readonly fields = [
    'cycleTimeSec',
    'temperatureC',
    'activeRobots',
    'weldsCompleted',
  ] as const;

  protected override computeNext(
    data: WeldingCellNodeData,
    field: string,
    current: number,
  ): number {
    // Spot welds pile up fast across a cell — a few per update.
    if (field === 'weldsCompleted') {
      return randomIncrement(current, 8);
    }
    // Usually all robots run; occasionally one drops out for a beat.
    if (field === 'activeRobots') {
      const total = data.totalRobots ?? 6;
      return Math.min(total, jitter(current, total, 0.7));
    }
    return super.computeNext(data, field, current);
  }
}
