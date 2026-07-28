import type { NodeStatus, NodeType, Update } from './node-data';

/**
 * This is the frontend stand-in for what a backend push message would carry.
 */
export interface DataUpdate {
  readonly nodeId: string;
  readonly type: NodeType;
  readonly status: NodeStatus;
  readonly metrics: Readonly<Record<string, unknown>>;
}

export function toDataUpdate(update: Update): DataUpdate {
  return {
    nodeId: update.nodeId,
    type: update.type,
    status: update.status,
    metrics: update.metrics as Readonly<Record<string, unknown>>,
  };
}
