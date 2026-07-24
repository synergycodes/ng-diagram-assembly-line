import type { ModuleStatus, ModuleType, Update } from './dto';

/**
 * This is the frontend stand-in for what a backend push message would carry.
 */
export interface DataUpdate {
  readonly nodeId: string;
  readonly moduleType: ModuleType;
  readonly status: ModuleStatus;
  readonly metrics: Readonly<Record<string, unknown>>;
}

export function toDataUpdate(update: Update): DataUpdate {
  return {
    nodeId: update.moduleId,
    moduleType: update.moduleType,
    status: update.moduleStatus,
    metrics: update.state as Readonly<Record<string, unknown>>,
  };
}
