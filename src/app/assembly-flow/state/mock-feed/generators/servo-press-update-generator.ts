import { NODE_TYPES, type ServoPressNodeData } from '../../../model';
import { NodeUpdateGenerator, randomIncrement } from './node-update-generator';

export class ServoPressUpdateGenerator extends NodeUpdateGenerator<ServoPressNodeData> {
  protected readonly type = NODE_TYPES.SERVO_PRESS;
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

  protected override computeNext(data: ServoPressNodeData, field: string, current: number): number {
    // Cumulative shift counter — only ever climbs; the rest are gauges (super).
    if (field === 'partsPressed') {
      return randomIncrement(current);
    }
    return super.computeNext(data, field, current);
  }
}
