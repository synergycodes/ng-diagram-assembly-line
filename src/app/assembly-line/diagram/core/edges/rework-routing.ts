import type { EdgeRouting, EdgeRoutingContext, Point } from 'ng-diagram';
import { reworkDetourPoints } from './rework-detour';

/** Routing name to set on rework edges (`edge.routing`) and to register under. */
export const REWORK_ROUTING_NAME = 'rework';

/**
 * A registered edge routing for the QC rework loop-backs. In `auto` mode
 * ng-diagram calls `computePoints` and re-flows the detour whenever the endpoint
 * nodes move or resize — so an untouched loop routes itself. Reshaping an edge
 * flips it to `manual` mode: ng-diagram then keeps the user's points and only
 * calls `computeSvgPath` / `computePointOnPath` to draw them, so those two are
 * plain polyline helpers that work for any point list.
 */
export class ReworkRouting implements EdgeRouting {
  readonly name = REWORK_ROUTING_NAME;

  computePoints(context: EdgeRoutingContext): Point[] {
    const source = { x: context.sourcePoint.x, y: context.sourcePoint.y };
    const target = { x: context.targetPoint.x, y: context.targetPoint.y };
    const bottoms: number[] = [];
    for (const node of [context.sourceNode, context.targetNode]) {
      if (node?.size) {
        bottoms.push(node.position.y + node.size.height);
      }
    }
    return reworkDetourPoints(source, target, bottoms);
  }

  computeSvgPath(points: Point[]): string {
    if (points.length < 2) {
      return '';
    }
    const [first, ...rest] = points;
    return `M ${first.x},${first.y}` + rest.map((p) => ` L ${p.x},${p.y}`).join('');
  }

  computePointOnPath(points: Point[], percentage: number): Point {
    const clamped = Math.min(1, Math.max(0, percentage));
    return pointAtDistance(points, totalLength(points) * clamped);
  }

  computePointAtDistance(points: Point[], distancePx: number): Point {
    return pointAtDistance(points, distancePx);
  }
}

function totalLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}

function pointAtDistance(points: readonly Point[], distance: number): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return { x: points[0].x, y: points[0].y };
  }
  let remaining = Math.max(0, distance);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segment || i === points.length - 2) {
      const t = segment === 0 ? 0 : remaining / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segment;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}
