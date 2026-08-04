import type { GroupNode, SimpleNode } from 'ng-diagram';
import { NODE_TYPES } from './node-data';
import type { NodeDataByType, NodeType } from './node-data';

export type NodeOf<TNodeType extends NodeType> = TNodeType extends typeof NODE_TYPES.AREA
  ? GroupNode<NodeDataByType[TNodeType]> & { type: TNodeType }
  : SimpleNode<NodeDataByType[TNodeType]> & { type: TNodeType };

export type AreaNode = NodeOf<typeof NODE_TYPES.AREA>;
export type BufferNode = NodeOf<typeof NODE_TYPES.BUFFER>;
export type ServoPressNode = NodeOf<typeof NODE_TYPES.SERVO_PRESS>;
export type WeldingCellNode = NodeOf<typeof NODE_TYPES.WELDING_CELL>;
export type AutoAssemblyNode = NodeOf<typeof NODE_TYPES.AUTO_ASSEMBLY>;
export type PaintShopNode = NodeOf<typeof NODE_TYPES.PAINT_SHOP>;
export type QualityControlNode = NodeOf<typeof NODE_TYPES.QUALITY_CONTROL>;

export type AssemblyNode =
  | AreaNode
  | BufferNode
  | ServoPressNode
  | WeldingCellNode
  | AutoAssemblyNode
  | PaintShopNode
  | QualityControlNode;

export function isAreaNode(node: SimpleNode | GroupNode): node is AreaNode {
  return node.type === NODE_TYPES.AREA;
}
