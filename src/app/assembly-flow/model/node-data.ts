export type NodeStatus = 'disconnected' | 'idle' | 'working' | 'error';

export const NODE_TYPES = {
  AREA: 'area',
  BUFFER: 'buffer',
  SERVO_PRESS: 'servo-press',
  WELDING_CELL: 'welding-cell',
  AUTO_ASSEMBLY: 'auto-assembly',
  PAINT_SHOP: 'paint-shop',
  QUALITY_CONTROL: 'quality-control',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export interface BaseNodeData {
  name: string;
  status: NodeStatus;
}

export type AreaNodeData = BaseNodeData;

export interface BufferNodeData extends BaseNodeData {
  capacity: number;
  currentCount?: number;
}

export interface ServoPressNodeData extends BaseNodeData {
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

export interface WeldingCellNodeData extends BaseNodeData {
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

export interface AutoAssemblyNodeData extends BaseNodeData {
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
  level?: number;
}

export interface ReworkItem {
  partName: string;
  color: string;
  defect: string;
}

export interface PaintShopNodeData extends BaseNodeData {
  paintLevels?: PaintLevel[];
  shiftLabel?: string;
  shiftRange?: string;
  unitsPassed?: number;
  unitsRework?: number;
  unitsTotal?: number;
  firstPassYieldPct?: number;
  reworkQueue?: ReworkItem[];
}

export interface QualityControlNodeData extends BaseNodeData {
  unitsPassed?: number;
  unitsRejected?: number;
  passedPercentage?: number;
  reworkLoopbackTargetId?: string;
}

export interface NodeDataByType {
  [NODE_TYPES.AREA]: AreaNodeData;
  [NODE_TYPES.BUFFER]: BufferNodeData;
  [NODE_TYPES.SERVO_PRESS]: ServoPressNodeData;
  [NODE_TYPES.WELDING_CELL]: WeldingCellNodeData;
  [NODE_TYPES.AUTO_ASSEMBLY]: AutoAssemblyNodeData;
  [NODE_TYPES.PAINT_SHOP]: PaintShopNodeData;
  [NODE_TYPES.QUALITY_CONTROL]: QualityControlNodeData;
}

export type AssemblyNodeData = NodeDataByType[NodeType];

export interface CarInTransit {
  id: string;
  progress: number;
}

export type EdgeType = 'flow' | 'rework';

export type EdgeFlowState = 'normal' | 'slow' | 'fast' | 'warn' | 'stopped';

export interface EdgeState {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  flowState?: EdgeFlowState;
  carsInTransit: CarInTransit[];
}

export type NodeMetrics<TNodeData extends AssemblyNodeData> = Partial<
  Omit<TNodeData, keyof BaseNodeData>
>;

export type Update = {
  [Key in NodeType]: {
    nodeId: string;
    type: Key;
    status: NodeStatus;
    metrics: NodeMetrics<NodeDataByType[Key]>;
  };
}[NodeType];
