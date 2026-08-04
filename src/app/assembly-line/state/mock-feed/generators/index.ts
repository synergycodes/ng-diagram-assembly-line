import { NODE_TYPES, type NodeType } from '../../../model';
import { AutoAssemblyUpdateGenerator } from './auto-assembly-update-generator';
import { BufferUpdateGenerator } from './buffer-update-generator';
import { NodeUpdateGenerator } from './node-update-generator';
import { PaintShopUpdateGenerator } from './paint-shop-update-generator';
import { QualityControlUpdateGenerator } from './quality-control-update-generator';
import { ServoPressUpdateGenerator } from './servo-press-update-generator';
import { WeldingCellUpdateGenerator } from './welding-cell-update-generator';

const GENERATORS: Partial<Record<NodeType, NodeUpdateGenerator>> = {
  [NODE_TYPES.BUFFER]: new BufferUpdateGenerator(),
  [NODE_TYPES.SERVO_PRESS]: new ServoPressUpdateGenerator(),
  [NODE_TYPES.WELDING_CELL]: new WeldingCellUpdateGenerator(),
  [NODE_TYPES.AUTO_ASSEMBLY]: new AutoAssemblyUpdateGenerator(),
  [NODE_TYPES.PAINT_SHOP]: new PaintShopUpdateGenerator(),
  [NODE_TYPES.QUALITY_CONTROL]: new QualityControlUpdateGenerator(),
};

export function getUpdateGenerator(type: NodeType): NodeUpdateGenerator | undefined {
  return GENERATORS[type];
}

export { NodeUpdateGenerator } from './node-update-generator';
export { applyUpdate } from './apply-update';
