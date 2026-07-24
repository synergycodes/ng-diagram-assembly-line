import type { ServoPressModule } from '../../../model';
import { ModuleUpdateGenerator, randomIncrement } from './module-update-generator';

export class ServoPressUpdateGenerator extends ModuleUpdateGenerator<ServoPressModule> {
  protected readonly fields = [
    'throughputPerHour',
    'pressureBar',
    'pressureKn',
    'temperatureC',
    'partsPressed',
    'oeePercent',
    'cycleTimeMs',
  ] as const;

  protected override readonly percentFields = new Set(['oeePercent']);

  protected override computeNext(module: ServoPressModule, field: string, current: number): number {
    // Cumulative shift counter — only ever climbs; the rest are gauges (super).
    if (field === 'partsPressed') {
      return randomIncrement(current);
    }
    return super.computeNext(module, field, current);
  }
}
