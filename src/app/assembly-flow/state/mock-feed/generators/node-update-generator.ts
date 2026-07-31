import type { AssemblyNodeData, NodeType, Update } from '../../../model';
import type { UpdateContext } from '../mock-feed-types';
import { GAUGE_PROFILES } from '../metric-profiles';

const MAX_DELTA = 5;

/** How strongly a gauge is pulled back toward its nominal each tick (0..1). */
const REVERSION = 0.2;

/**
 * Produces metric deltas for one node type. Operates on the node's `data` payload
 * plus an {@link UpdateContext} carrying the node id (for upstream checks and the
 * emitted update); the node's type is declared per subclass as `type`.
 */
export abstract class NodeUpdateGenerator<D extends AssemblyNodeData = AssemblyNodeData> {
  protected abstract readonly type: NodeType;
  protected abstract readonly fields: readonly string[];
  protected readonly percentFields: ReadonlySet<string> = new Set();
  protected readonly requiresWorkingUpstream: boolean = false;

  generate(data: D, context: UpdateContext): Update | null {
    if (this.fields.length === 0) {
      return null;
    }
    if (this.requiresWorkingUpstream && !this.hasWorkingUpstream(context)) {
      return null;
    }
    const metrics: Record<string, unknown> = {};
    for (const field of this.fields) {
      const partial = this.generateField(data, field);
      if (partial) {
        Object.assign(metrics, partial);
      }
    }
    if (Object.keys(metrics).length === 0) {
      return null;
    }
    return this.makeUpdate(data, context.nodeId, metrics);
  }

  protected generateField(data: D, field: string): Record<string, unknown> | null {
    const record = data as unknown as Record<string, number>;
    // Metrics start "not available" (undefined) in the seed, so treat a missing
    // value as 0 — the first tick then walks up from a clean baseline instead of
    // producing NaN.
    const current = Number.isFinite(record[field]) ? record[field] : 0;
    let next = this.computeNext(data, field, current);
    if (this.percentFields.has(field)) {
      next = Math.min(100, next);
    }
    return { [field]: next };
  }

  protected makeUpdate(data: D, nodeId: string, metrics: Record<string, unknown>): Update {
    return { nodeId, type: this.type, status: data.status, metrics } as Update;
  }

  /**
   * Gauge fields (see {@link GAUGE_PROFILES}) hover around their nominal via
   * {@link jitter}; anything else falls back to a bounded random walk. Subclasses
   * override for accumulators/drains and delegate gauges back here via `super`.
   */
  protected computeNext(data: D, field: string, current: number): number {
    const gauge = GAUGE_PROFILES[this.type]?.[field];
    if (gauge) {
      return jitter(current, gauge.nominal, gauge.spread);
    }
    return randomWalk(current);
  }

  protected hasWorkingUpstream({ nodeId, state, edges }: UpdateContext): boolean {
    return edges.some(
      (edge) => edge.target === nodeId && state[edge.source]?.data.status === 'working',
    );
  }
}

export function randomWalk(current: number, max = MAX_DELTA): number {
  const direction = Math.random() < 0.5 ? -1 : 1;
  const magnitude = randomMagnitude(max);
  return Math.max(0, current + direction * magnitude);
}

/**
 * Mean-reverting noise around a setpoint: pull `current` a fraction of the way to
 * `nominal`, then add symmetric ±`spread` noise. Keeps a metric hovering around a
 * realistic operating point instead of drifting like an unbounded random walk.
 */
export function jitter(current: number, nominal: number, spread: number): number {
  const reverted = current + (nominal - current) * REVERSION;
  const noise = (Math.random() * 2 - 1) * spread;
  return Math.max(0, Math.round(reverted + noise));
}

export function randomIncrement(current: number, max = MAX_DELTA): number {
  return current + randomMagnitude(max);
}

/** 1 with probability `chance`, else 0 — for rare, one-at-a-time events (rejects, rework). */
export function occasionalIncrement(chance = 0.15): number {
  return Math.random() < chance ? 1 : 0;
}

export function randomDrain(
  current: number,
  lowThreshold: number,
  refillLevel: number,
  max = MAX_DELTA,
): number {
  const next = current - randomMagnitude(max);
  return next <= lowThreshold ? refillLevel : next;
}

export function randomMagnitude(max = MAX_DELTA): number {
  return Math.floor(Math.random() * max) + 1;
}
