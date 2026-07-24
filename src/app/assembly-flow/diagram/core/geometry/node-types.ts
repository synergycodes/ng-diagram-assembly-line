import type { Node } from 'ng-diagram';

export const NODE_TYPES = {
  MODULE: 'module',
  AREA: 'area',
  PAINT_SHOP: 'paint-shop',
  AUTO_ASSEMBLY: 'auto-assembly',
} as const;

export const FLOW_EDGE_TYPE = 'flow';

export function isAreaNode(node: Node): boolean {
  return node.type === NODE_TYPES.AREA;
}
