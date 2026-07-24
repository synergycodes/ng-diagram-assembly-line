import { MODULE_TYPES, type Module, type ModuleType } from './dto';

export interface PropertyMeta {
  key: string;
  label: string;
  unit?: string;
  numeric?: boolean;
  min?: number;
  max?: number;
  direction?: 'higher-is-worse' | 'lower-is-worse';
  defaultWarnAt?: number;
  defaultCriticalAt?: number;
  alwaysVisible?: boolean;
}

const PROPERTIES: Record<ModuleType, PropertyMeta[]> = {
  [MODULE_TYPES.AREA]: [],
  [MODULE_TYPES.BUFFER]: [
    { key: 'capacity', label: 'Capacity', numeric: true, min: 0, max: 30 },
    {
      key: 'currentCount',
      label: 'Current',
      numeric: true,
      min: 0,
      max: 30,
      direction: 'higher-is-worse',
      defaultWarnAt: 23,
      defaultCriticalAt: 28,
      alwaysVisible: true,
    },
  ],
  [MODULE_TYPES.SERVO_PRESS]: [
    {
      key: 'throughputPerHour',
      label: 'Throughput',
      unit: '/h',
      numeric: true,
      min: 0,
      max: 700,
      direction: 'lower-is-worse',
      defaultWarnAt: 400,
      defaultCriticalAt: 250,
    },
    {
      key: 'oeePercent',
      label: 'OEE',
      unit: '%',
      numeric: true,
      min: 0,
      max: 100,
      direction: 'lower-is-worse',
      defaultWarnAt: 70,
      defaultCriticalAt: 55,
    },
    {
      key: 'pressureBar',
      label: 'Pressure',
      unit: 'bar',
      numeric: true,
      min: 0,
      max: 250,
      direction: 'higher-is-worse',
      defaultWarnAt: 200,
      defaultCriticalAt: 230,
    },
    {
      key: 'temperatureC',
      label: 'Temperature',
      unit: '°C',
      numeric: true,
      min: 0,
      max: 120,
      direction: 'higher-is-worse',
      defaultWarnAt: 75,
      defaultCriticalAt: 90,
    },
    {
      key: 'pressureKn',
      label: 'Press force',
      unit: 'kN',
      numeric: true,
      min: 0,
      max: 2500,
      direction: 'higher-is-worse',
      defaultWarnAt: 2000,
      defaultCriticalAt: 2300,
    },
    {
      key: 'cycleTimeMs',
      label: 'Cycle',
      unit: 'ms',
      numeric: true,
      min: 0,
      max: 12000,
      direction: 'higher-is-worse',
      defaultWarnAt: 7000,
      defaultCriticalAt: 9000,
    },
    { key: 'partsPressed', label: 'Pressed', numeric: true, min: 0, max: 10000 },
  ],
  [MODULE_TYPES.WELDING_CELL]: [
    {
      key: 'cycleTimeSec',
      label: 'Cycle',
      unit: 's',
      numeric: true,
      min: 0,
      max: 120,
      direction: 'higher-is-worse',
      defaultWarnAt: 75,
      defaultCriticalAt: 95,
    },
    {
      key: 'temperatureC',
      label: 'Temperature',
      unit: '°C',
      numeric: true,
      min: 0,
      max: 100,
      direction: 'higher-is-worse',
      defaultWarnAt: 70,
      defaultCriticalAt: 85,
    },
    {
      key: 'activeRobots',
      label: 'Active robots',
      numeric: true,
      min: 0,
      max: 8,
      direction: 'lower-is-worse',
      defaultWarnAt: 4,
      defaultCriticalAt: 2,
    },
    { key: 'totalRobots', label: 'Total robots', numeric: true, min: 0, max: 8 },
    { key: 'weldsCompleted', label: 'Welds', numeric: true, min: 0, max: 10000 },
  ],
  [MODULE_TYPES.AUTO_ASSEMBLY]: [
    {
      key: 'partsRemaining',
      label: 'Parts remaining',
      numeric: true,
      min: 0,
      max: 250,
      direction: 'lower-is-worse',
      defaultWarnAt: 50,
      defaultCriticalAt: 20,
    },
    {
      key: 'partsToLoad',
      label: 'Parts to load',
      numeric: true,
      min: 0,
      max: 150,
      direction: 'higher-is-worse',
      defaultWarnAt: 80,
      defaultCriticalAt: 120,
    },
    {
      key: 'cycleTimeSec',
      label: 'Cycle time',
      unit: 's',
      numeric: true,
      min: 0,
      max: 300,
      direction: 'higher-is-worse',
      defaultWarnAt: 210,
      defaultCriticalAt: 260,
    },
    {
      key: 'targetCycleTimeSec',
      label: 'Target cycle',
      unit: 's',
      numeric: true,
      min: 0,
      max: 300,
    },
    {
      key: 'nextRefillMin',
      label: 'Next refill',
      unit: 'min',
      numeric: true,
      min: 0,
      max: 60,
      direction: 'lower-is-worse',
      defaultWarnAt: 15,
      defaultCriticalAt: 5,
    },
    {
      key: 'manualWorkers',
      label: 'Active workers',
      numeric: true,
      min: 0,
      max: 12,
      direction: 'lower-is-worse',
      defaultWarnAt: 4,
      defaultCriticalAt: 2,
    },
    {
      key: 'inspectionTimeMin',
      label: 'Inspection time',
      unit: 'min',
      numeric: true,
      min: 0,
      max: 40,
      direction: 'higher-is-worse',
      defaultWarnAt: 20,
      defaultCriticalAt: 30,
    },
  ],
  [MODULE_TYPES.PAINT_SHOP]: [
    { key: 'unitsPassed', label: 'Passed', numeric: true, min: 0, max: 3000 },
    {
      key: 'unitsRework',
      label: 'Rework',
      numeric: true,
      min: 0,
      max: 200,
      direction: 'higher-is-worse',
      defaultWarnAt: 40,
      defaultCriticalAt: 80,
    },
    { key: 'unitsTotal', label: 'Total', numeric: true, min: 0, max: 3000 },
    {
      key: 'firstPassYieldPct',
      label: 'First pass yield',
      unit: '%',
      numeric: true,
      min: 0,
      max: 100,
      direction: 'lower-is-worse',
      defaultWarnAt: 92,
      defaultCriticalAt: 88,
    },
  ],
  [MODULE_TYPES.QUALITY_CONTROL]: [
    { key: 'unitsPassed', label: 'Passed', numeric: true, min: 0, max: 3000 },
    {
      key: 'unitsRejected',
      label: 'Rejected',
      numeric: true,
      min: 0,
      max: 300,
      direction: 'higher-is-worse',
      defaultWarnAt: 30,
      defaultCriticalAt: 80,
    },
    {
      key: 'passedPercentage',
      label: 'Pass rate',
      unit: '%',
      numeric: true,
      min: 0,
      max: 100,
      direction: 'lower-is-worse',
      defaultWarnAt: 92,
      defaultCriticalAt: 85,
    },
  ],
};

export function getPropertyMeta(type: ModuleType): PropertyMeta[] {
  return PROPERTIES[type] ?? [];
}

export function getPropertyValue(state: Module, key: string): string | number | undefined {
  return (state as unknown as Record<string, string | number | undefined>)[key];
}

export type Tone = 'default' | 'ok' | 'warn' | 'danger';

export function computeTone(
  value: number,
  meta: PropertyMeta,
  warnAt?: number,
  criticalAt?: number,
): Tone {
  const w = warnAt ?? meta.defaultWarnAt;
  const c = criticalAt ?? meta.defaultCriticalAt;
  // No thresholds configured → the metric has no health range, so it stays
  // neutral ('default') rather than being painted "OK" green.
  if (w === undefined || c === undefined) {
    return 'default';
  }
  if (meta.direction === 'lower-is-worse') {
    if (value <= c) {
      return 'danger';
    }
    if (value <= w) {
      return 'warn';
    }
    return 'ok';
  }
  // higher-is-worse (default)
  if (value >= c) {
    return 'danger';
  }
  if (value >= w) {
    return 'warn';
  }
  return 'ok';
}
