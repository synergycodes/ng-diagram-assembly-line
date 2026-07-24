import type { BufferModule } from '../../../model';
import { ModuleUpdateGenerator, jitter } from './module-update-generator';

export class BufferUpdateGenerator extends ModuleUpdateGenerator<BufferModule> {
  protected readonly fields = ['currentCount'] as const;
  protected override readonly requiresWorkingUpstream = true;

  protected override computeNext(module: BufferModule, _field: string, current: number): number {
    // A buffer sits around half-full as material flows in and out — hover around
    // ~55% capacity rather than filling monotonically to the brim.
    const nominal = module.capacity * 0.55;
    const spread = Math.max(1, module.capacity * 0.12);
    return Math.min(module.capacity, jitter(current, nominal, spread));
  }
}
