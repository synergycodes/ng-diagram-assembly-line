import type { AssemblyNode, EdgeState } from '../../model';

/** The engine's working set: each scoped node (id → live node) it ticks. */
export type ProductionState = Record<string, AssemblyNode>;

export interface ProductionSnapshot {
  nodes: AssemblyNode[];
  edges: EdgeState[];
  timestamp: number;
}

export interface UpdateContext {
  nodeId: string;
  state: ProductionState;
  edges: readonly EdgeState[];
}
