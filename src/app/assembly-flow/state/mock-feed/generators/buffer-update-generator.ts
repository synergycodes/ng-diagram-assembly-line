import { NODE_TYPES, type BufferNodeData } from '../../../model';
import { NodeUpdateGenerator, jitter } from './node-update-generator';

export class BufferUpdateGenerator extends NodeUpdateGenerator<BufferNodeData> {
  protected readonly type = NODE_TYPES.BUFFER;
  protected readonly fields = ['currentCount'] as const;
  protected override readonly requiresWorkingUpstream = true;

  protected override computeNext(data: BufferNodeData, _field: string, current: number): number {
    // A buffer sits around half-full as material flows in and out — hover around
    // ~55% capacity rather than filling monotonically to the brim.
    const nominal = data.capacity * 0.55;
    const spread = Math.max(1, data.capacity * 0.12);
    return Math.min(data.capacity, jitter(current, nominal, spread));
  }
}
