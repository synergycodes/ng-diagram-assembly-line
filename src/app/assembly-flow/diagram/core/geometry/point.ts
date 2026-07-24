import type { Point } from 'ng-diagram';
import { POSITION_TOLERANCE_PX } from './constants';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Shallow copy of a point (new object, same coords). */
export function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

/** Shallow copy of a polyline. */
export function clonePoints(points: readonly Point[]): Point[] {
  return points.map(clonePoint);
}

/** Two scalars equal within tolerance — absorbs sub-pixel float drift from
 *  rotation/snap math without merging genuinely distinct values. */
export function near(a: number, b: number, tol = POSITION_TOLERANCE_PX): boolean {
  return Math.abs(a - b) < tol;
}

/** Points share an x within tolerance (i.e. the segment between them is vertical). */
export function sameX(a: Point, b: Point, tol = POSITION_TOLERANCE_PX): boolean {
  return near(a.x, b.x, tol);
}

/** Points share a y within tolerance (i.e. the segment between them is horizontal). */
export function sameY(a: Point, b: Point, tol = POSITION_TOLERANCE_PX): boolean {
  return near(a.y, b.y, tol);
}

/** Every segment of the polyline is axis-aligned (horizontal or vertical). */
export function isOrthogonalPolyline(
  points: readonly Point[],
  tol = POSITION_TOLERANCE_PX,
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    if (!sameX(points[i], points[i + 1], tol) && !sameY(points[i], points[i + 1], tol)) {
      return false;
    }
  }
  return true;
}

/** Point lies within the rectangle (edges inclusive). */
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
