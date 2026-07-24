// 'disconnected' is the default before a node receives live data; the mock feed
// moves nodes to a live status (idle/working/error) on connect.
export type ModuleStatus = 'disconnected' | 'idle' | 'working' | 'error';

export const MODULE_TYPES = {
  AREA: 'area',
  BUFFER: 'buffer',
  SERVO_PRESS: 'servo-press',
  WELDING_CELL: 'welding-cell',
  AUTO_ASSEMBLY: 'auto-assembly',
  PAINT_SHOP: 'paint-shop',
  QUALITY_CONTROL: 'quality-control',
} as const;

export type ModuleType = (typeof MODULE_TYPES)[keyof typeof MODULE_TYPES];

export interface BaseModule {
  id: string;
  name: string;
  type: ModuleType;
  status: ModuleStatus;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  groupId?: string;
}

export interface AreaModule extends BaseModule {
  type: typeof MODULE_TYPES.AREA;
  isGroup: true;
}

export interface BufferModule extends BaseModule {
  type: typeof MODULE_TYPES.BUFFER;
  /** Bar denominator — required so the progress bar can render. */
  capacity: number;
  /** Live metric — undefined until the feed starts ticking in monitor mode. */
  currentCount?: number;
}

export interface ServoPressModule extends BaseModule {
  type: typeof MODULE_TYPES.SERVO_PRESS;
  /* All metrics are optional — they fill in once live data-bus updates arrive. */
  throughputPerHour?: number;
  oeePercent?: number;
  pressureBar?: number;
  temperatureC?: number;
  pressureKn?: number;
  minPressure?: number;
  maxPressure?: number;
  cycleTimeMs?: number;
  partsPressed?: number;
}

export interface WeldingCellModule extends BaseModule {
  type: typeof MODULE_TYPES.WELDING_CELL;
  cycleTimeSec?: number;
  temperatureC?: number;
  activeRobots?: number;
  totalRobots?: number;
  weldsCompleted?: number;
}

export type AssemblyTaskStatus = 'done' | 'pending';

export interface AssemblyTask {
  description: string;
  status: AssemblyTaskStatus;
}

export interface AutoAssemblyModule extends BaseModule {
  type: typeof MODULE_TYPES.AUTO_ASSEMBLY;
  partsRemaining?: number;
  partsToLoad?: number;
  cycleTimeSec?: number;
  targetCycleTimeSec?: number;
  nextRefillMin?: number;
  manualWorkers?: number;
  inspectionTimeMin?: number;
  currentTasks?: AssemblyTask[];
}

export interface PaintLevel {
  name: string;
  color: string;
  /** Tank fill 0..100 — undefined until live data arrives (rendered as N/A). */
  level?: number;
}

export interface ReworkItem {
  partName: string;
  color: string;
  defect: string;
}

export interface PaintShopModule extends BaseModule {
  type: typeof MODULE_TYPES.PAINT_SHOP;
  paintLevels?: PaintLevel[];
  shiftLabel?: string;
  shiftRange?: string;
  unitsPassed?: number;
  unitsRework?: number;
  unitsTotal?: number;
  firstPassYieldPct?: number;
  reworkQueue?: ReworkItem[];
}

export interface QualityControlModule extends BaseModule {
  type: typeof MODULE_TYPES.QUALITY_CONTROL;
  unitsPassed?: number;
  unitsRejected?: number;
  passedPercentage?: number;
  reworkLoopbackTargetId?: string;
}

export type Module =
  | AreaModule
  | BufferModule
  | ServoPressModule
  | WeldingCellModule
  | AutoAssemblyModule
  | PaintShopModule
  | QualityControlModule;

export interface CarInTransit {
  id: string;
  progress: number;
}

export type EdgeKind = 'flow' | 'rework';

export type EdgeFlowState = 'normal' | 'slow' | 'fast' | 'warn' | 'stopped';

export interface EdgeState {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  flowState?: EdgeFlowState;
  carsInTransit: CarInTransit[];
}

export interface ProductionSnapshot {
  modules: Module[];
  edges: EdgeState[];
  timestamp: number;
}

export type ProductionState = Record<Module['id'], Module>;

export type ModuleProperties<M extends Module = Module> = M extends Module
  ? Partial<Omit<M, keyof BaseModule>>
  : never;

export type Update = {
  [K in ModuleType]: {
    moduleId: string;
    moduleType: K;
    moduleStatus: ModuleStatus;
    state: ModuleProperties<Extract<Module, { type: K }>>;
  };
}[ModuleType];
