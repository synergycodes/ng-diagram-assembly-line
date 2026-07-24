import {
  DEFAULT_PAINT_LEVELS,
  MODULE_TYPES,
  type EdgeState,
  type Module,
  type ModuleStatus,
  type ProductionSnapshot,
  type ProductionState,
  type Update,
} from '../../model';
import { applyUpdate, getUpdateGenerator } from './generators';
import { bootGauge } from './metric-profiles';

const BUFFER_CAPACITY_MIN = 18;
const BUFFER_CAPACITY_MAX = 30;

const PAINT_LEVEL_START_MIN = 45;
const PAINT_LEVEL_START_MAX = 90;

const MODULE_STATUS_WEIGHTS: readonly (readonly [ModuleStatus, number])[] = [
  ['idle', 1],
  ['working', 10],
  ['error', 1],
];

const BASE_MODULE_KEYS = new Set<string>([
  'id',
  'name',
  'type',
  'status',
  'position',
  'size',
  'groupId',
]);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollStatus(): ModuleStatus {
  const totalWeight = MODULE_STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  let next: ModuleStatus = MODULE_STATUS_WEIGHTS[0][0];
  for (const [status, weight] of MODULE_STATUS_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) {
      next = status;
      break;
    }
  }
  return next;
}

function buildInitialState(snapshot: ProductionSnapshot): ProductionState {
  const state: ProductionState = {};
  for (const module of snapshot.modules) {
    state[module.id] = { ...initModule(module), status: rollStatus() };
  }
  return state;
}

/**
 * Seed each module at a realistic operating point so working nodes come online
 * with plausible readings (gauges near their nominal, counters mid-shift) rather
 * than every metric ramping up from zero.
 */
function initModule(module: Module): Module {
  const boot = (field: string) => bootGauge(module.type, field);
  switch (module.type) {
    case MODULE_TYPES.BUFFER: {
      const capacity = randomInt(BUFFER_CAPACITY_MIN, BUFFER_CAPACITY_MAX);
      return { ...module, capacity, currentCount: Math.round(capacity * 0.5) };
    }
    case MODULE_TYPES.SERVO_PRESS:
      return {
        ...module,
        throughputPerHour: boot('throughputPerHour'),
        oeePercent: boot('oeePercent'),
        pressureBar: boot('pressureBar'),
        temperatureC: boot('temperatureC'),
        pressureKn: boot('pressureKn'),
        cycleTimeMs: boot('cycleTimeMs'),
        partsPressed: randomInt(1200, 3200),
      };
    case MODULE_TYPES.WELDING_CELL: {
      const totalRobots = 6;
      return {
        ...module,
        cycleTimeSec: boot('cycleTimeSec'),
        temperatureC: boot('temperatureC'),
        totalRobots,
        activeRobots: totalRobots,
        weldsCompleted: randomInt(2200, 7800),
      };
    }
    case MODULE_TYPES.AUTO_ASSEMBLY:
      return {
        ...module,
        partsRemaining: randomInt(60, 180),
        partsToLoad: boot('partsToLoad'),
        cycleTimeSec: boot('cycleTimeSec'),
        targetCycleTimeSec: 150,
        nextRefillMin: randomInt(8, 28),
        manualWorkers: boot('manualWorkers'),
        inspectionTimeMin: boot('inspectionTimeMin'),
      };
    case MODULE_TYPES.PAINT_SHOP: {
      const unitsPassed = randomInt(420, 1180);
      const unitsRework = randomInt(6, 36);
      return {
        ...module,
        paintLevels: (module.paintLevels ?? DEFAULT_PAINT_LEVELS).map((paint) => ({
          ...paint,
          level: paint.level ?? randomInt(PAINT_LEVEL_START_MIN, PAINT_LEVEL_START_MAX),
        })),
        unitsPassed,
        unitsRework,
        unitsTotal: unitsPassed + unitsRework,
        firstPassYieldPct: boot('firstPassYieldPct'),
      };
    }
    case MODULE_TYPES.QUALITY_CONTROL:
      return {
        ...module,
        unitsPassed: randomInt(520, 1240),
        unitsRejected: randomInt(4, 32),
        passedPercentage: boot('passedPercentage'),
      };
    case MODULE_TYPES.AREA:
    default:
      return module;
  }
}

/**
 * A working module emits its full metric set so the first tick fills every KPI;
 * a non-working module (idle/error) comes online with its status only and no
 * readings — matching `generateStep`, which likewise walks metrics for working
 * modules alone. Its KPIs therefore stay N/A until it starts working.
 */
function buildInitialUpdate(module: Module): Update {
  const state: Record<string, unknown> = {};
  if (module.status === 'working') {
    for (const [key, value] of Object.entries(module)) {
      if (!BASE_MODULE_KEYS.has(key)) {
        state[key] = value;
      }
    }
  }
  return {
    moduleId: module.id,
    moduleType: module.type,
    moduleStatus: module.status,
    state,
  } as Update;
}

export class MockProductionEngine {
  private state: ProductionState = {};
  private edges: readonly EdgeState[] = [];
  private updates: Update[] = [];

  init(snapshot: ProductionSnapshot): void {
    this.state = buildInitialState(snapshot);
    this.edges = snapshot.edges;
    this.updates = Object.values(this.state).map(buildInitialUpdate);
  }

  generateStep(): void {
    const ids = Object.keys(this.state);
    if (ids.length === 0) {
      return;
    }

    const moduleId = ids[Math.floor(Math.random() * ids.length)];
    const module = this.state[moduleId];
    if (module.status !== 'working') {
      return;
    }

    const generator = getUpdateGenerator(module);
    if (!generator) {
      return;
    }

    const update = generator.generate(module, { state: this.state, edges: this.edges });
    if (!update) {
      return;
    }

    applyUpdate(this.state, update);
    this.updates.push(update);
  }

  statusStep(): void {
    const ids = Object.keys(this.state);
    if (ids.length === 0) {
      return;
    }

    for (const moduleId of ids) {
      const module = this.state[moduleId];
      const nextStatus = rollStatus();

      const update = {
        moduleId,
        moduleType: module.type,
        moduleStatus: nextStatus,
        state: {},
      } as Update;

      applyUpdate(this.state, update);
      this.updates.push(update);
    }
  }

  drain(): Update[] {
    const drained = this.updates;
    this.updates = [];
    return drained;
  }
}
