import { MODULE_TYPES, type Module, type ModuleType } from '../../../model';
import { AutoAssemblyUpdateGenerator } from './auto-assembly-update-generator';
import { BufferUpdateGenerator } from './buffer-update-generator';
import { ModuleUpdateGenerator } from './module-update-generator';
import { PaintShopUpdateGenerator } from './paint-shop-update-generator';
import { QualityControlUpdateGenerator } from './quality-control-update-generator';
import { ServoPressUpdateGenerator } from './servo-press-update-generator';
import { WeldingCellUpdateGenerator } from './welding-cell-update-generator';

const GENERATORS: Partial<Record<ModuleType, ModuleUpdateGenerator<Module>>> = {
  [MODULE_TYPES.BUFFER]: new BufferUpdateGenerator(),
  [MODULE_TYPES.SERVO_PRESS]: new ServoPressUpdateGenerator(),
  [MODULE_TYPES.WELDING_CELL]: new WeldingCellUpdateGenerator(),
  [MODULE_TYPES.AUTO_ASSEMBLY]: new AutoAssemblyUpdateGenerator(),
  [MODULE_TYPES.PAINT_SHOP]: new PaintShopUpdateGenerator(),
  [MODULE_TYPES.QUALITY_CONTROL]: new QualityControlUpdateGenerator(),
};

export function getUpdateGenerator(module: Module): ModuleUpdateGenerator<Module> | undefined {
  return GENERATORS[module.type];
}

export { ModuleUpdateGenerator } from './module-update-generator';
export { applyUpdate } from './apply-update';
