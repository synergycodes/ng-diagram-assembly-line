import type { Node } from 'ng-diagram';
import {
  getPropertyMeta,
  getPropertyValue,
  NODE_TYPES,
  type AssemblyNodeData,
  type BufferNodeData,
  type NodeType,
} from '../../../model';
import { nodeShortId, statusFooter } from '../../../shared/node-view';
import type { DxfNodeRenderer, DxfRenderContext } from '../dxf/dxf-types';
import { addText, strokeLine, strokePolyline, strokeRect } from './dxf-draw-helpers';
import {
  BODY_PAD_X,
  BODY_PAD_Y,
  BUFFER_BAR_HEIGHT,
  CARD_PAD_X,
  FALLBACK_NODE_HEIGHT,
  FALLBACK_NODE_WIDTH,
  FONT_BUFFER_LABEL,
  FONT_BUFFER_VALUE,
  FONT_CODE,
  FONT_FOOTER,
  FONT_KPI_LABEL,
  FONT_KPI_VALUE,
  FONT_NAME,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  KPI_PAD_X,
  KPI_PAD_Y,
  KPI_TWO_COLUMN_THRESHOLD,
  LAYERS,
  LINE_WEIGHT,
  SPARK_HEIGHT,
  SPARK_MARGIN_TOP,
  TEXT_LINE_HEIGHT_RATIO,
  TEXT_STYLE,
} from './assembly-dxf-constants';

/** Reads a node's historical series for a numeric metric key (e.g. HistoryService.read). */
export type SeriesReader = (nodeId: string, key: string) => number[];

/**
 * Node types whose on-screen KPI cells carry sparklines (the AssemblyNode
 * family, minus buffer which shows a capacity bar). Paint-shop and auto-assembly
 * use bespoke templates with no sparklines, so none are drawn for them even
 * though history exists — the DXF should match what's rendered.
 */
const SPARKLINE_TYPES: ReadonlySet<NodeType> = new Set([
  NODE_TYPES.SERVO_PRESS,
  NODE_TYPES.WELDING_CELL,
  NODE_TYPES.QUALITY_CONTROL,
]);

interface KpiCell {
  readonly key: string;
  readonly numeric: boolean;
  readonly label: string;
  readonly value: string;
}

/**
 * Builds the shared renderer for all six station types, closing over
 * `readSeries` for the KPI sparklines.
 *
 * The card frame is drawn from the node's MEASURED size/position so it lines up
 * with what ng-diagram rendered and with the edges routed to its ports. Bespoke
 * dashboards (paint-shop, auto-assembly) are represented by their KPIs rather
 * than reproduced pixel-for-pixel — the DXF is a CAD schematic, not a
 * screenshot. To specialize a type, register a dedicated renderer for it in
 * `assembly-dxf-config.ts`.
 */
export const createStationNodeRenderer = (readSeries: SeriesReader): DxfNodeRenderer => {
  return (ctx, node) => {
    const type = node.type as NodeType;
    const data = node.data as AssemblyNodeData;
    const x = node.position.x;
    const y = node.position.y;
    const width = node.size?.width ?? FALLBACK_NODE_WIDTH;
    const height = node.size?.height ?? FALLBACK_NODE_HEIGHT;

    // Card frame.
    strokeRect(ctx, LAYERS.NODES, x, y, width, height, LINE_WEIGHT.NODE_FRAME);

    renderHeader(ctx, node, type, data, x, y, width);

    const bodyTop = y + HEADER_HEIGHT;
    const bodyBottom = y + height - FOOTER_HEIGHT;
    const bodyHeight = Math.max(0, bodyBottom - bodyTop);
    if (bodyHeight > 0) {
      if (type === NODE_TYPES.BUFFER) {
        renderBufferBody(ctx, data as BufferNodeData, x, width, bodyTop, bodyHeight);
      } else {
        renderKpiGrid(ctx, node.id, type, data, x, width, bodyTop, bodyHeight, readSeries);
      }
    }

    renderFooter(ctx, type, data, x, y, width, height);
  };
};

const renderHeader = (
  ctx: DxfRenderContext,
  node: Node,
  type: NodeType,
  data: AssemblyNodeData,
  x: number,
  y: number,
  width: number,
): void => {
  const centerY = y + HEADER_HEIGHT / 2;
  addText(ctx, LAYERS.NODES, data.name, x + CARD_PAD_X, centerY, FONT_NAME, TEXT_STYLE.BOLD, 0, 2);
  addText(
    ctx,
    LAYERS.NODES,
    nodeShortId(type, node.id),
    x + width - CARD_PAD_X,
    centerY,
    FONT_CODE,
    TEXT_STYLE.STANDARD,
    2,
    2,
  );
  strokeLine(
    ctx,
    LAYERS.NODES,
    x,
    y + HEADER_HEIGHT,
    x + width,
    y + HEADER_HEIGHT,
    LINE_WEIGHT.DIVIDER,
  );
};

const renderFooter = (
  ctx: DxfRenderContext,
  type: NodeType,
  data: AssemblyNodeData,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  const footerTop = y + height - FOOTER_HEIGHT;
  strokeLine(ctx, LAYERS.NODES, x, footerTop, x + width, footerTop, LINE_WEIGHT.DIVIDER);
  addText(
    ctx,
    LAYERS.NODES,
    statusFooter(type, data).text,
    x + CARD_PAD_X,
    footerTop + FOOTER_HEIGHT / 2,
    FONT_FOOTER,
    TEXT_STYLE.STANDARD,
    0,
    2,
  );
};

const renderBufferBody = (
  ctx: DxfRenderContext,
  data: BufferNodeData,
  x: number,
  width: number,
  bodyTop: number,
  bodyHeight: number,
): void => {
  const { capacity, currentCount } = data;
  const known = typeof capacity === 'number' && typeof currentCount === 'number';
  const text = known ? `${currentCount}/${capacity}` : 'N/A';
  const pct = known && capacity > 0 ? Math.min(1, Math.max(0, currentCount / capacity)) : 0;

  const labelCenterY = bodyTop + BODY_PAD_Y + (FONT_BUFFER_LABEL * TEXT_LINE_HEIGHT_RATIO) / 2;
  addText(
    ctx,
    LAYERS.NODES,
    'CAPACITY',
    x + BODY_PAD_X,
    labelCenterY,
    FONT_BUFFER_LABEL,
    TEXT_STYLE.STANDARD,
    0,
    2,
  );
  addText(
    ctx,
    LAYERS.NODES,
    text,
    x + width - BODY_PAD_X,
    labelCenterY,
    FONT_BUFFER_VALUE,
    TEXT_STYLE.BOLD,
    2,
    2,
  );

  const barY = labelCenterY + (FONT_BUFFER_VALUE * TEXT_LINE_HEIGHT_RATIO) / 2 + BODY_PAD_Y;
  const barW = width - 2 * BODY_PAD_X;
  if (barY + BUFFER_BAR_HEIGHT <= bodyTop + bodyHeight && barW > 0) {
    strokeRect(
      ctx,
      LAYERS.NODES,
      x + BODY_PAD_X,
      barY,
      barW,
      BUFFER_BAR_HEIGHT,
      LINE_WEIGHT.DETAIL,
    );
    if (pct > 0) {
      strokeRect(
        ctx,
        LAYERS.NODES,
        x + BODY_PAD_X,
        barY,
        barW * pct,
        BUFFER_BAR_HEIGHT,
        LINE_WEIGHT.DETAIL,
      );
    }
  }
};

const renderKpiGrid = (
  ctx: DxfRenderContext,
  nodeId: string,
  type: NodeType,
  data: AssemblyNodeData,
  x: number,
  width: number,
  bodyTop: number,
  bodyHeight: number,
  readSeries: SeriesReader,
): void => {
  const metrics: KpiCell[] = getPropertyMeta(type).map((meta) => {
    const raw = getPropertyValue(data, meta.key);
    const value = raw === undefined || raw === null ? 'N/A' : String(raw);
    return {
      key: meta.key,
      numeric: Boolean(meta.numeric),
      label: meta.label.toUpperCase(),
      value: meta.unit ? `${value} ${meta.unit}` : value,
    };
  });
  if (metrics.length === 0) {
    return;
  }

  const showSparklines = SPARKLINE_TYPES.has(type);
  const cols = metrics.length > KPI_TWO_COLUMN_THRESHOLD ? 2 : 1;
  const rows = Math.ceil(metrics.length / cols);
  const cellW = width / cols;
  const cellH = bodyHeight / rows;

  // Grid hairlines mirror the 1px gaps over the subtle background in the DOM.
  if (cols === 2) {
    strokeLine(
      ctx,
      LAYERS.NODES,
      x + cellW,
      bodyTop,
      x + cellW,
      bodyTop + bodyHeight,
      LINE_WEIGHT.DIVIDER,
    );
  }
  for (let row = 1; row < rows; row++) {
    const lineY = bodyTop + row * cellH;
    strokeLine(ctx, LAYERS.NODES, x, lineY, x + width, lineY, LINE_WEIGHT.DIVIDER);
  }

  metrics.forEach((metric, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cellX = x + col * cellW;
    const cellY = bodyTop + row * cellH;
    const labelCenterY = cellY + KPI_PAD_Y + (FONT_KPI_LABEL * TEXT_LINE_HEIGHT_RATIO) / 2;
    const valueCenterY =
      labelCenterY +
      (FONT_KPI_LABEL * TEXT_LINE_HEIGHT_RATIO) / 2 +
      (FONT_KPI_VALUE * TEXT_LINE_HEIGHT_RATIO) / 2;
    addText(
      ctx,
      LAYERS.NODES,
      metric.label,
      cellX + KPI_PAD_X,
      labelCenterY,
      FONT_KPI_LABEL,
      TEXT_STYLE.STANDARD,
      0,
      2,
    );
    addText(
      ctx,
      LAYERS.NODES,
      metric.value,
      cellX + KPI_PAD_X,
      valueCenterY,
      FONT_KPI_VALUE,
      TEXT_STYLE.BOLD,
      0,
      2,
    );

    if (showSparklines && metric.numeric) {
      const series = readSeries(nodeId, metric.key);
      if (series.length > 1) {
        const valueBottom = valueCenterY + (FONT_KPI_VALUE * TEXT_LINE_HEIGHT_RATIO) / 2;
        renderSparkline(ctx, series, cellX, cellW, valueBottom, cellY + cellH);
      }
    }
  });
};

/**
 * Draws a KPI history trace as a polyline, reproducing SparklineComponent's
 * normalization (`y = h-1 - ((v-min)/range)*(h-2)`, evenly-spaced x). Skipped
 * when the mini-chart would not fit under the value in its cell.
 */
const renderSparkline = (
  ctx: DxfRenderContext,
  series: readonly number[],
  cellX: number,
  cellW: number,
  valueBottom: number,
  cellBottom: number,
): void => {
  const top = valueBottom + SPARK_MARGIN_TOP;
  const boxW = cellW - 2 * KPI_PAD_X;
  if (boxW <= 0 || top + SPARK_HEIGHT > cellBottom) {
    return;
  }
  const boxX = cellX + KPI_PAD_X;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series.map((value, index) => ({
    x: boxX + (index / (series.length - 1)) * boxW,
    y: top + (SPARK_HEIGHT - 1) - ((value - min) / range) * (SPARK_HEIGHT - 2),
  }));
  strokePolyline(ctx, LAYERS.NODES, points, LINE_WEIGHT.SPARK);
};
