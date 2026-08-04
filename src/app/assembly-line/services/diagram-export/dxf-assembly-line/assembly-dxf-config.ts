import { NODE_TYPES } from '../../../model';
import { DxfLayer } from '../dxf/dxf-layer';
import { DxfTextStyle } from '../dxf/dxf-text-style';
import type { DxfExportConfig } from '../dxf/dxf-types';
import {
  ACI,
  DIAGRAM_PADDING,
  DXF_SCALE_MM_PER_PX,
  LAYERS,
  TEXT_STYLE,
} from './assembly-dxf-constants';
import { renderAreaNode } from './area-node-renderer';
import { renderFlowEdge } from './flow-edge-renderer';
import { createStationNodeRenderer, type SeriesReader } from './station-node-renderer';

/**
 * Wires assembly-line's renderers into the generic DxfExporter.
 *
 * Every node type is registered explicitly — `area` to its container renderer,
 * the six station types to the shared schematic-card renderer. Both edge kinds
 * (forward flow and rework loop-backs) arrive under the ng-diagram edge type
 * `flow`; `renderFlowEdge` splits them apart internally.
 *
 * `readSeries` supplies each node's metric history so KPI cells can draw their
 * sparklines (pass `HistoryService.read`); a `() => []` stub disables them.
 *
 * To specialize a type (e.g. draw the paint-shop swatches or the auto-assembly
 * task list), write a dedicated `DxfNodeRenderer` and swap its entry in here —
 * nothing in the generic `dxf/` library changes.
 */
export const buildAssemblyLineDxfConfig = (readSeries: SeriesReader): DxfExportConfig => {
  const renderStationNode = createStationNodeRenderer(readSeries);
  return {
    scaleMmPerPx: DXF_SCALE_MM_PER_PX,
    paddingPx: DIAGRAM_PADDING,
    layers: [
      new DxfLayer(LAYERS.AREAS, ACI.GREY),
      new DxfLayer(LAYERS.NODES, ACI.WHITE),
      new DxfLayer(LAYERS.FLOW, ACI.GREY),
      new DxfLayer(LAYERS.REWORK, ACI.AMBER),
    ],
    textStyles: [new DxfTextStyle(TEXT_STYLE.STANDARD), new DxfTextStyle(TEXT_STYLE.BOLD, true)],
    nodeRenderers: {
      [NODE_TYPES.AREA]: renderAreaNode,
      [NODE_TYPES.BUFFER]: renderStationNode,
      [NODE_TYPES.SERVO_PRESS]: renderStationNode,
      [NODE_TYPES.WELDING_CELL]: renderStationNode,
      [NODE_TYPES.AUTO_ASSEMBLY]: renderStationNode,
      [NODE_TYPES.PAINT_SHOP]: renderStationNode,
      [NODE_TYPES.QUALITY_CONTROL]: renderStationNode,
    },
    edgeRenderers: {
      flow: renderFlowEdge,
    },
  };
};
