import type { WeldingCellModule } from '../../../model';
import { ModuleUpdateGenerator, jitter, randomIncrement } from './module-update-generator';

export class WeldingCellUpdateGenerator extends ModuleUpdateGenerator<WeldingCellModule> {
  protected readonly fields = [
    'cycleTimeSec',
    'temperatureC',
    'activeRobots',
    'weldsCompleted',
  ] as const;

  protected override computeNext(
    module: WeldingCellModule,
    field: string,
    current: number,
  ): number {
    // Spot welds pile up fast across a cell — a few per update.
    if (field === 'weldsCompleted') {
      return randomIncrement(current, 8);
    }
    // Usually all robots run; occasionally one drops out for a beat.
    if (field === 'activeRobots') {
      const total = module.totalRobots ?? 6;
      return Math.min(total, jitter(current, total, 0.7));
    }
    return super.computeNext(module, field, current);
  }
}
