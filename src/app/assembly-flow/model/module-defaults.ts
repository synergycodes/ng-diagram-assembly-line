import { MODULE_TYPES, type Module, type ModuleType, type PaintLevel } from './dto';

/**
 * `level` is left undefined so each tank reads N/A until live data arrives
 * (the mock feed seeds and then drains/refills these levels).
 */
export const DEFAULT_PAINT_LEVELS: readonly PaintLevel[] = [
  { name: 'Pearl White', color: '#e8e6e0' },
  { name: 'Graphite Grey', color: '#4a4d52' },
  { name: 'Racing Red', color: '#c0392b' },
];

export interface ModuleTypeMeta {
  type: ModuleType;
  label: string;
  group: 'Group' | 'Sources' | 'Buffers' | 'Processing' | 'Quality';
}

export const MODULE_TYPE_META: ModuleTypeMeta[] = [
  { type: MODULE_TYPES.AREA, label: 'Area', group: 'Group' },
  { type: MODULE_TYPES.BUFFER, label: 'Buffer', group: 'Buffers' },
  { type: MODULE_TYPES.SERVO_PRESS, label: 'Servo Press', group: 'Sources' },
  { type: MODULE_TYPES.WELDING_CELL, label: 'Welding Cell', group: 'Processing' },
  { type: MODULE_TYPES.AUTO_ASSEMBLY, label: 'Assembly', group: 'Processing' },
  { type: MODULE_TYPES.PAINT_SHOP, label: 'Paint Shop', group: 'Processing' },
  { type: MODULE_TYPES.QUALITY_CONTROL, label: 'Quality Control', group: 'Quality' },
];

/**
 * Every numeric metric is left `undefined` so node templates render `N/A`.
 * Real values arrive only in monitor mode through the data-bus updates.
 *
 * Required structural fields are filled with sensible defaults so the
 * visualisation can render (e.g. Buffer needs `capacity` to draw the bar).
 */
export function createDefaultModule(
  type: ModuleType,
  id: string,
  position = { x: 0, y: 0 },
): Module {
  switch (type) {
    case MODULE_TYPES.AREA:
      return {
        id,
        position,
        type,
        name: 'Area',
        status: 'disconnected',
        isGroup: true,
        size: { width: 400, height: 300 },
      };
    case MODULE_TYPES.BUFFER:
      return { id, position, type, name: 'Buffer', status: 'disconnected', capacity: 30 };
    case MODULE_TYPES.SERVO_PRESS:
      return { id, position, type, name: 'Servo Press', status: 'disconnected' };
    case MODULE_TYPES.WELDING_CELL:
      return { id, position, type, name: 'Welding Cell', status: 'disconnected' };
    case MODULE_TYPES.AUTO_ASSEMBLY:
      return { id, position, type, name: 'Assembly', status: 'disconnected' };
    case MODULE_TYPES.PAINT_SHOP:
      return {
        id,
        position,
        type,
        name: 'Paint Shop',
        status: 'disconnected',
        paintLevels: DEFAULT_PAINT_LEVELS.map((paint) => ({ ...paint })),
      };
    case MODULE_TYPES.QUALITY_CONTROL:
      return { id, position, type, name: 'Quality Control', status: 'disconnected' };
  }
}
