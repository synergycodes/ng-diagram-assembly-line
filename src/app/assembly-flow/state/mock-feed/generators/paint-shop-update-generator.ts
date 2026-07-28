import { NODE_TYPES, type PaintShopNodeData, type Update } from '../../../model';
import {
  NodeUpdateGenerator,
  occasionalIncrement,
  randomDrain,
  randomMagnitude,
} from './node-update-generator';
import type { UpdateContext } from '../mock-feed-types';

const PAINT_LOW_THRESHOLD = 5;
const PAINT_REFILL_LEVEL = 80;

export class PaintShopUpdateGenerator extends NodeUpdateGenerator<PaintShopNodeData> {
  protected readonly type = NODE_TYPES.PAINT_SHOP;
  protected readonly fields = [
    'paintLevels',
    'unitsPassed',
    'unitsRework',
    'firstPassYieldPct',
  ] as const;

  protected override readonly percentFields = new Set(['firstPassYieldPct']);

  override generate(data: PaintShopNodeData, context: UpdateContext): Update | null {
    if (this.requiresWorkingUpstream && !this.hasWorkingUpstream(context)) {
      return null;
    }

    const metrics: Record<string, unknown> = {};

    const paintLevels = this.computePaintLevels(data);
    if (paintLevels) {
      metrics['paintLevels'] = paintLevels;
    }

    // Most batches pass; rework is the exception (~1 in 7 updates adds one),
    // keeping the rework counter and first-pass yield in a realistic band.
    const passedDelta = randomMagnitude(6);
    const reworkDelta = occasionalIncrement();
    metrics['unitsPassed'] = (data.unitsPassed ?? 0) + passedDelta;
    metrics['unitsRework'] = (data.unitsRework ?? 0) + reworkDelta;
    metrics['unitsTotal'] = (data.unitsTotal ?? 0) + passedDelta + reworkDelta;

    const yieldPartial = this.generateField(data, 'firstPassYieldPct');
    if (yieldPartial) {
      Object.assign(metrics, yieldPartial);
    }

    return this.makeUpdate(data, context.nodeId, metrics);
  }

  private computePaintLevels(data: PaintShopNodeData): PaintShopNodeData['paintLevels'] | null {
    const paintLevels = data.paintLevels ?? [];
    if (paintLevels.length === 0) {
      return null;
    }
    return paintLevels.map((paint) => ({
      ...paint,
      level: randomDrain(
        paint.level ?? PAINT_REFILL_LEVEL,
        PAINT_LOW_THRESHOLD,
        PAINT_REFILL_LEVEL,
        2,
      ),
    }));
  }
}
