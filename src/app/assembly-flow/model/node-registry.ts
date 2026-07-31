import { NODE_TYPES, type NodeType, type NodeDataByType, type PaintLevel } from './node-data';
import { PROPERTIES, type PropertyMeta } from './property-meta';

interface Size {
  width: number;
  height: number;
}

export const DEFAULT_PAINT_LEVELS: readonly PaintLevel[] = [
  { name: 'Pearl White', color: '#e8e6e0' },
  { name: 'Graphite Grey', color: '#4a4d52' },
  { name: 'Racing Red', color: '#c0392b' },
];

interface BaseDescriptor<TNodeType extends NodeType> {
  readonly type: TNodeType;
  readonly label: string;
  readonly properties: PropertyMeta[];
  createDefault(): NodeDataByType[TNodeType];
}

interface GroupDescriptor<TNodeType extends NodeType> extends BaseDescriptor<TNodeType> {
  readonly paletteSize: Size;
}

type DescriptorFor<TNodeType extends NodeType> = TNodeType extends typeof NODE_TYPES.AREA
  ? GroupDescriptor<TNodeType>
  : BaseDescriptor<TNodeType>;

export type NodeDescriptor = DescriptorFor<NodeType>;

type NodeRegistry = { [Key in NodeType]: DescriptorFor<Key> };

export const NODE_REGISTRY: NodeRegistry = {
  [NODE_TYPES.AREA]: {
    type: NODE_TYPES.AREA,
    label: 'Area',
    paletteSize: { width: 360, height: 220 },
    properties: PROPERTIES[NODE_TYPES.AREA],
    createDefault: () => ({ name: 'Area', status: 'disconnected' }),
  },
  [NODE_TYPES.BUFFER]: {
    type: NODE_TYPES.BUFFER,
    label: 'Buffer',
    properties: PROPERTIES[NODE_TYPES.BUFFER],
    createDefault: () => ({ name: 'Buffer', status: 'disconnected', capacity: 30 }),
  },
  [NODE_TYPES.SERVO_PRESS]: {
    type: NODE_TYPES.SERVO_PRESS,
    label: 'Servo Press',
    properties: PROPERTIES[NODE_TYPES.SERVO_PRESS],
    createDefault: () => ({ name: 'Servo Press', status: 'disconnected' }),
  },
  [NODE_TYPES.WELDING_CELL]: {
    type: NODE_TYPES.WELDING_CELL,
    label: 'Welding Cell',
    properties: PROPERTIES[NODE_TYPES.WELDING_CELL],
    createDefault: () => ({ name: 'Welding Cell', status: 'disconnected' }),
  },
  [NODE_TYPES.AUTO_ASSEMBLY]: {
    type: NODE_TYPES.AUTO_ASSEMBLY,
    label: 'Assembly',
    properties: PROPERTIES[NODE_TYPES.AUTO_ASSEMBLY],
    createDefault: () => ({ name: 'Assembly', status: 'disconnected' }),
  },
  [NODE_TYPES.PAINT_SHOP]: {
    type: NODE_TYPES.PAINT_SHOP,
    label: 'Paint Shop',
    properties: PROPERTIES[NODE_TYPES.PAINT_SHOP],
    createDefault: () => ({
      name: 'Paint Shop',
      status: 'disconnected',
      paintLevels: DEFAULT_PAINT_LEVELS.map((paint) => ({ ...paint })),
    }),
  },
  [NODE_TYPES.QUALITY_CONTROL]: {
    type: NODE_TYPES.QUALITY_CONTROL,
    label: 'Quality Control',
    properties: PROPERTIES[NODE_TYPES.QUALITY_CONTROL],
    createDefault: () => ({ name: 'Quality Control', status: 'disconnected' }),
  },
};
