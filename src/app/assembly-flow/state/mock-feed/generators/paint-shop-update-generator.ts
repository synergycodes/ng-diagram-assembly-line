import type { PaintShopModule, Update } from '../../../model';
import {
  ModuleUpdateGenerator,
  occasionalIncrement,
  randomDrain,
  randomMagnitude,
  type UpdateContext,
} from './module-update-generator';

const PAINT_LOW_THRESHOLD = 5;
const PAINT_REFILL_LEVEL = 80;

export class PaintShopUpdateGenerator extends ModuleUpdateGenerator<PaintShopModule> {
  protected readonly fields = [
    'paintLevels',
    'unitsPassed',
    'unitsRework',
    'firstPassYieldPct',
  ] as const;

  protected override readonly percentFields = new Set(['firstPassYieldPct']);

  override generate(module: PaintShopModule, context: UpdateContext): Update | null {
    if (this.requiresWorkingUpstream && !this.hasWorkingUpstream(module, context)) {
      return null;
    }

    const state: Record<string, unknown> = {};

    const paintLevels = this.computePaintLevels(module);
    if (paintLevels) {
      state['paintLevels'] = paintLevels;
    }

    // Most batches pass; rework is the exception (~1 in 7 updates adds one),
    // keeping the rework counter and first-pass yield in a realistic band.
    const passedDelta = randomMagnitude(6);
    const reworkDelta = occasionalIncrement();
    state['unitsPassed'] = (module.unitsPassed ?? 0) + passedDelta;
    state['unitsRework'] = (module.unitsRework ?? 0) + reworkDelta;
    state['unitsTotal'] = (module.unitsTotal ?? 0) + passedDelta + reworkDelta;

    const yieldPartial = this.generateField(module, 'firstPassYieldPct');
    if (yieldPartial) {
      Object.assign(state, yieldPartial);
    }

    return this.makeUpdate(module, state);
  }

  private computePaintLevels(module: PaintShopModule): PaintShopModule['paintLevels'] | null {
    const paintLevels = module.paintLevels ?? [];
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
