import { NODE_TYPES, type QualityControlNodeData } from '../../../model';
import { NodeUpdateGenerator, occasionalIncrement, randomIncrement } from './node-update-generator';

export class QualityControlUpdateGenerator extends NodeUpdateGenerator<QualityControlNodeData> {
  protected readonly type = NODE_TYPES.QUALITY_CONTROL;
  protected readonly fields = ['unitsPassed', 'unitsRejected', 'passedPercentage'] as const;

  protected override readonly percentFields = new Set(['passedPercentage']);

  protected override computeNext(
    data: QualityControlNodeData,
    field: string,
    current: number,
  ): number {
    // Inspected units climb steadily; rejects are occasional.
    if (field === 'unitsPassed') {
      return randomIncrement(current);
    }
    if (field === 'unitsRejected') {
      return current + occasionalIncrement();
    }
    // passedPercentage is a gauge.
    return super.computeNext(data, field, current);
  }
}
