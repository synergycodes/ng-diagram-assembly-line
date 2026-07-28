import {
  DEFAULT_PAINT_LEVELS,
  NODE_TYPES,
  type AssemblyNode,
  type AssemblyNodeData,
  type EdgeState,
  type NodeStatus,
  type Update,
} from '../../model';
import { applyUpdate, getUpdateGenerator } from './generators';
import type { ProductionSnapshot, ProductionState } from './mock-feed-types';
import { bootGauge } from './metric-profiles';

const BUFFER_CAPACITY_MIN = 18;
const BUFFER_CAPACITY_MAX = 30;

const PAINT_LEVEL_START_MIN = 45;
const PAINT_LEVEL_START_MAX = 90;

const NODE_STATUS_WEIGHTS: readonly (readonly [NodeStatus, number])[] = [
  ['idle', 1],
  ['working', 10],
  ['error', 1],
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollStatus(): NodeStatus {
  const totalWeight = NODE_STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  let next: NodeStatus = NODE_STATUS_WEIGHTS[0][0];
  for (const [status, weight] of NODE_STATUS_WEIGHTS) {
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
  for (const node of snapshot.nodes) {
    state[node.id] = {
      ...node,
      data: { ...initNodeData(node), status: rollStatus() },
    } as AssemblyNode;
  }
  return state;
}

/**
 * Seed each node's `data` at a realistic operating point so working nodes come
 * online with plausible readings (gauges near their nominal, counters mid-shift)
 * rather than every metric ramping up from zero.
 */
function initNodeData(node: AssemblyNode): AssemblyNodeData {
  const boot = (field: string) => bootGauge(node.type, field);
  switch (node.type) {
    case NODE_TYPES.BUFFER: {
      const capacity = randomInt(BUFFER_CAPACITY_MIN, BUFFER_CAPACITY_MAX);
      return { ...node.data, capacity, currentCount: Math.round(capacity * 0.5) };
    }
    case NODE_TYPES.SERVO_PRESS:
      return {
        ...node.data,
        throughputPerHour: boot('throughputPerHour'),
        oeePercent: boot('oeePercent'),
        pressureBar: boot('pressureBar'),
        temperatureC: boot('temperatureC'),
        pressureKn: boot('pressureKn'),
        cycleTimeMs: boot('cycleTimeMs'),
        partsPressed: randomInt(1200, 3200),
      };
    case NODE_TYPES.WELDING_CELL: {
      const totalRobots = 6;
      return {
        ...node.data,
        cycleTimeSec: boot('cycleTimeSec'),
        temperatureC: boot('temperatureC'),
        totalRobots,
        activeRobots: totalRobots,
        weldsCompleted: randomInt(2200, 7800),
      };
    }
    case NODE_TYPES.AUTO_ASSEMBLY:
      return {
        ...node.data,
        partsRemaining: randomInt(60, 180),
        partsToLoad: boot('partsToLoad'),
        cycleTimeSec: boot('cycleTimeSec'),
        targetCycleTimeSec: 150,
        nextRefillMin: randomInt(8, 28),
        manualWorkers: boot('manualWorkers'),
        inspectionTimeMin: boot('inspectionTimeMin'),
      };
    case NODE_TYPES.PAINT_SHOP: {
      const unitsPassed = randomInt(420, 1180);
      const unitsRework = randomInt(6, 36);
      return {
        ...node.data,
        paintLevels: (node.data.paintLevels ?? DEFAULT_PAINT_LEVELS).map((paint) => ({
          ...paint,
          level: paint.level ?? randomInt(PAINT_LEVEL_START_MIN, PAINT_LEVEL_START_MAX),
        })),
        unitsPassed,
        unitsRework,
        unitsTotal: unitsPassed + unitsRework,
        firstPassYieldPct: boot('firstPassYieldPct'),
      };
    }
    case NODE_TYPES.QUALITY_CONTROL:
      return {
        ...node.data,
        unitsPassed: randomInt(520, 1240),
        unitsRejected: randomInt(4, 32),
        passedPercentage: boot('passedPercentage'),
      };
    case NODE_TYPES.AREA:
    default:
      return node.data;
  }
}

/**
 * A working node emits its full metric set so the first tick fills every KPI; a
 * non-working node (idle/error) comes online with its status only and no readings
 * — matching `generateStep`, which likewise walks metrics for working nodes alone.
 * Its KPIs therefore stay N/A until it starts working.
 */
function buildInitialUpdate(node: AssemblyNode): Update {
  const metrics: Record<string, unknown> = {};
  if (node.data.status === 'working') {
    for (const [key, value] of Object.entries(node.data)) {
      if (key !== 'name' && key !== 'status') {
        metrics[key] = value;
      }
    }
  }
  return { nodeId: node.id, type: node.type, status: node.data.status, metrics } as Update;
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

    const nodeId = ids[Math.floor(Math.random() * ids.length)];
    const node = this.state[nodeId];
    if (node.data.status !== 'working') {
      return;
    }

    const generator = getUpdateGenerator(node.type);
    if (!generator) {
      return;
    }

    const update = generator.generate(node.data, { nodeId, state: this.state, edges: this.edges });
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

    for (const nodeId of ids) {
      const node = this.state[nodeId];
      const nextStatus = rollStatus();

      const update = { nodeId, type: node.type, status: nextStatus, metrics: {} } as Update;

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
