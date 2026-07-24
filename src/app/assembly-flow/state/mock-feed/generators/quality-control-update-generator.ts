import type { QualityControlModule } from '../../../model';
import {
  ModuleUpdateGenerator,
  occasionalIncrement,
  randomIncrement,
} from './module-update-generator';

export class QualityControlUpdateGenerator extends ModuleUpdateGenerator<QualityControlModule> {
  protected readonly fields = ['unitsPassed', 'unitsRejected', 'passedPercentage'] as const;

  protected override readonly percentFields = new Set(['passedPercentage']);

  protected override computeNext(
    module: QualityControlModule,
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
    return super.computeNext(module, field, current);
  }
}
