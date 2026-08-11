import type { Point } from 'ng-diagram';
import { DxfLwPolyline } from '../dxf/dxf-entity';
import type { DxfEdgeRenderer, DxfRenderContext } from '../dxf/dxf-types';
import { isReworkEdge } from './edge-geometry';
import {
  LAYERS,
  LINE_WEIGHT,
  REWORK_CHEVRON_LENGTH,
  REWORK_CHEVRON_WIDTH,
  REWORK_MARKER_SPACING,
} from './assembly-dxf-constants';

/**
 * Emits one LWPOLYLINE per edge from `edge.points`.
 *
 * Every edge is registered under the ng-diagram type `flow`; a rework
 * loop-back is distinguished by its data/port (see `isReworkEdge`) and drawn on
 * the REWORK layer with direction chevrons along the path, mirroring the amber
 * chevron markers `FlowEdgeComponent` places on the on-screen detour. Forward
 * flow edges are a plain polyline on the FLOW layer.
 *
 * The points are drawn as-is — `edge.points` holds the rendered route (see `edge-geometry.ts`).
 */
export const renderFlowEdge: DxfEdgeRenderer = (ctx, edge) => {
  const points = edge.points ?? [];
  if (points.length < 2) {
    return;
  }

  const rework = isReworkEdge(edge);
  const layer = rework ? LAYERS.REWORK : LAYERS.FLOW;
  const lineweight = rework ? LINE_WEIGHT.REWORK : LINE_WEIGHT.FLOW;

  const mapped = points.map((point) => ctx.mapper.mapPoint(point.x, point.y));
  ctx.doc.addEntity(new DxfLwPolyline(layer, mapped, false, undefined, lineweight));

  if (rework) {
    renderDirectionChevrons(ctx, points);
  }
};

/**
 * One chevron per `REWORK_MARKER_SPACING` px of path (at least one), each
 * pointing along the source→target travel direction — the same cadence
 * `FlowEdgeComponent.computeMarkers` uses.
 */
const renderDirectionChevrons = (ctx: DxfRenderContext, points: readonly Point[]): void => {
  const segments: { a: Point; b: Point; length: number; start: number }[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ a, b, length, start: total });
    total += length;
  }
  if (total === 0) {
    return;
  }

  const count = Math.max(1, Math.floor(total / REWORK_MARKER_SPACING));
  for (let i = 0; i < count; i++) {
    const distance = ((i + 0.5) / count) * total;
    const segment =
      segments.find((s) => distance <= s.start + s.length) ?? segments[segments.length - 1];
    const t = segment.length === 0 ? 0 : (distance - segment.start) / segment.length;
    const position = {
      x: segment.a.x + (segment.b.x - segment.a.x) * t,
      y: segment.a.y + (segment.b.y - segment.a.y) * t,
    };
    const dirLength = segment.length === 0 ? 1 : segment.length;
    const dir = {
      x: (segment.b.x - segment.a.x) / dirLength,
      y: (segment.b.y - segment.a.y) / dirLength,
    };
    drawChevron(ctx, position, dir);
  }
};

/** A `>`-shaped arrowhead centred on `position`, tip along unit direction `dir`. */
const drawChevron = (ctx: DxfRenderContext, position: Point, dir: Point): void => {
  const half = REWORK_CHEVRON_LENGTH / 2;
  const wing = REWORK_CHEVRON_WIDTH / 2;
  const normal = { x: -dir.y, y: dir.x };
  const tip = { x: position.x + dir.x * half, y: position.y + dir.y * half };
  const tail = { x: position.x - dir.x * half, y: position.y - dir.y * half };
  const wingA = { x: tail.x + normal.x * wing, y: tail.y + normal.y * wing };
  const wingB = { x: tail.x - normal.x * wing, y: tail.y - normal.y * wing };
  const chevron = [wingA, tip, wingB].map((point) => ctx.mapper.mapPoint(point.x, point.y));
  ctx.doc.addEntity(
    new DxfLwPolyline(LAYERS.REWORK, chevron, false, undefined, LINE_WEIGHT.REWORK),
  );
};
