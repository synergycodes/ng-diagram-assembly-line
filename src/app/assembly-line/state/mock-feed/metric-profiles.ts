import { NODE_TYPES, type NodeType } from '../../model';

/**
 * Operating point for a "gauge" metric — one that hovers around a setpoint rather
 * than accumulating or draining. `jitter()` pulls the live value gently back
 * toward `nominal` each tick and adds ±~`spread` noise, so readings behave like
 * real shop-floor telemetry (steady, with small excursions) instead of ramping up
 * from zero or random-walking away from their operating point.
 */
export interface GaugeProfile {
  nominal: number;
  spread: number;
}

/**
 * Nominal operating values per module type. Thresholds in `model/property-meta`
 * are set to bracket these so a healthy line reads green, with the occasional
 * noise excursion tipping a metric into warning.
 */
export const GAUGE_PROFILES: Partial<Record<NodeType, Record<string, GaugeProfile>>> = {
  [NODE_TYPES.SERVO_PRESS]: {
    throughputPerHour: { nominal: 520, spread: 22 },
    oeePercent: { nominal: 82, spread: 3 },
    pressureBar: { nominal: 118, spread: 7 },
    temperatureC: { nominal: 54, spread: 3 },
    pressureKn: { nominal: 1250, spread: 55 },
    cycleTimeMs: { nominal: 6900, spread: 250 },
  },
  [NODE_TYPES.WELDING_CELL]: {
    cycleTimeSec: { nominal: 26, spread: 2 },
    temperatureC: { nominal: 32, spread: 2 },
  },
  [NODE_TYPES.AUTO_ASSEMBLY]: {
    partsToLoad: { nominal: 28, spread: 6 },
    cycleTimeSec: { nominal: 28, spread: 2 },
    inspectionTimeMin: { nominal: 2, spread: 0.5 },
    manualWorkers: { nominal: 18, spread: 1.5 },
  },
  [NODE_TYPES.PAINT_SHOP]: { firstPassYieldPct: { nominal: 96, spread: 1.5 } },
  [NODE_TYPES.QUALITY_CONTROL]: { passedPercentage: { nominal: 97, spread: 1.5 } },
};

/** A slightly randomized boot value for a gauge, so modules don't all start identical. */
export function bootGauge(type: NodeType, field: string): number {
  const g = GAUGE_PROFILES[type]?.[field];
  if (!g) {
    return 0;
  }
  const noise = (Math.random() * 2 - 1) * g.spread;
  return Math.max(0, Math.round(g.nominal + noise));
}
