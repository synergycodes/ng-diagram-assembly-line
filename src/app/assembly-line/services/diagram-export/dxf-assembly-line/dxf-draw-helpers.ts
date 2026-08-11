import { DxfLwPolyline, DxfText } from '../dxf/dxf-entity';
import type { DxfRenderContext } from '../dxf/dxf-types';

/**
 * Thin drawing helpers shared by the node renderers. Each takes *diagram*
 * coordinates and delegates the px→mm + Y-flip conversion to `ctx.mapper`, so
 * renderers can reason entirely in the same coordinate space as
 * `node.position` / `edge.points`.
 */

/** Closed rectangle outline, corners given by top-left (x, y) in diagram coords. */
export function strokeRect(
  ctx: DxfRenderContext,
  layer: string,
  x: number,
  y: number,
  width: number,
  height: number,
  lineweight: number,
): void {
  const corners = [
    ctx.mapper.mapPoint(x, y),
    ctx.mapper.mapPoint(x + width, y),
    ctx.mapper.mapPoint(x + width, y + height),
    ctx.mapper.mapPoint(x, y + height),
  ];
  ctx.doc.addEntity(new DxfLwPolyline(layer, corners, true, undefined, lineweight));
}

/** Straight segment between two diagram-coordinate points. */
export function strokeLine(
  ctx: DxfRenderContext,
  layer: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  lineweight: number,
): void {
  ctx.doc.addEntity(
    new DxfLwPolyline(
      layer,
      [ctx.mapper.mapPoint(fromX, fromY), ctx.mapper.mapPoint(toX, toY)],
      false,
      undefined,
      lineweight,
    ),
  );
}

/** Open polyline through a run of diagram-coordinate points. */
export function strokePolyline(
  ctx: DxfRenderContext,
  layer: string,
  points: readonly { x: number; y: number }[],
  lineweight: number,
): void {
  if (points.length < 2) {
    return;
  }
  const mapped = points.map((point) => ctx.mapper.mapPoint(point.x, point.y));
  ctx.doc.addEntity(new DxfLwPolyline(layer, mapped, false, undefined, lineweight));
}

/**
 * Single line of text anchored at (x, y) in diagram coords. `fontPx` is the
 * on-screen font size; it is scaled to mm through the mapper so text keeps its
 * proportion to the geometry. halign: 0 left, 1 center, 2 right. valign:
 * 0 baseline, 1 bottom, 2 middle, 3 top.
 */
export function addText(
  ctx: DxfRenderContext,
  layer: string,
  text: string,
  x: number,
  y: number,
  fontPx: number,
  style: string,
  halign: 0 | 1 | 2 = 0,
  valign: 0 | 1 | 2 | 3 = 0,
): void {
  const point = ctx.mapper.mapPoint(x, y);
  ctx.doc.addEntity(
    new DxfText(layer, text, point.x, point.y, ctx.mapper.mapLength(fontPx), style, halign, valign),
  );
}
