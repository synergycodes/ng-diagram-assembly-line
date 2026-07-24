import type { Point } from 'ng-diagram';
import { sameX, sameY } from '../../core/geometry/point';

export type ReshapeEndpointKind = 'anchored' | 'free' | 'dangling';

export interface ReshapeSegment {
  readonly segmentIndex: number;
  readonly midpoint: Point;
  readonly axis: 'horizontal' | 'vertical';
  readonly propagateToFreeEnd: 'source' | 'target' | null;
  readonly anchorPortAtSource: boolean;
  readonly anchorPortAtTarget: boolean;
}

export function findReshapeableSegments(
  points: readonly Point[] | undefined,
  sourceKind: ReshapeEndpointKind,
  targetKind: ReshapeEndpointKind,
): ReshapeSegment[] {
  const segments: ReshapeSegment[] = [];
  if (!points || points.length < 2) {
    return segments;
  }
  const lastSegmentIndex = points.length - 2;
  for (let i = 0; i <= lastSegmentIndex; i++) {
    const segStart = points[i];
    const segEnd = points[i + 1];
    const horizontal = sameY(segStart, segEnd);
    const vertical = sameX(segStart, segEnd);
    if (horizontal === vertical) {
      continue;
    }
    const isFirst = i === 0;
    const isLast = i === lastSegmentIndex;
    const propagateToFreeEnd: 'source' | 'target' | null =
      isFirst && sourceKind === 'free'
        ? 'source'
        : isLast && targetKind === 'free'
          ? 'target'
          : null;
    segments.push({
      segmentIndex: i,
      midpoint: { x: (segStart.x + segEnd.x) / 2, y: (segStart.y + segEnd.y) / 2 },
      axis: horizontal ? 'horizontal' : 'vertical',
      propagateToFreeEnd,
      anchorPortAtSource: isFirst && sourceKind === 'anchored',
      anchorPortAtTarget: isLast && targetKind === 'anchored',
    });
  }
  return segments;
}

export function reshapeSegment(
  points: readonly Point[],
  segmentIndex: number,
  axis: 'horizontal' | 'vertical',
  dxWorld: number,
  dyWorld: number,
  gridPx: number,
): Point[] {
  const result = points.map((p) => ({ ...p }));
  const segStart = result[segmentIndex];
  const segEnd = result[segmentIndex + 1];
  if (axis === 'horizontal') {
    const target = segStart.y + dyWorld;
    const snapped = Math.round(target / gridPx) * gridPx;
    segStart.y = snapped;
    segEnd.y = snapped;
  } else {
    const target = segStart.x + dxWorld;
    const snapped = Math.round(target / gridPx) * gridPx;
    segStart.x = snapped;
    segEnd.x = snapped;
  }
  return result;
}

export function reshapeAnchoredSegment(
  initialPoints: readonly Point[],
  segmentIndex: number,
  axis: 'horizontal' | 'vertical',
  dxWorld: number,
  dyWorld: number,
  gridPx: number,
  anchorSource: boolean,
  anchorTarget: boolean,
): Point[] {
  const shifted = reshapeSegment(initialPoints, segmentIndex, axis, dxWorld, dyWorld, gridPx);
  const lastIndex = shifted.length - 1;
  const willAnchorSource = anchorSource && segmentIndex === 0;
  const willAnchorTarget = anchorTarget && segmentIndex + 1 === lastIndex;
  if (!willAnchorSource && !willAnchorTarget) {
    return shifted;
  }

  let result: Point[] = shifted;

  // Process target-end first so the source-end splice doesn't shift indices.
  if (willAnchorTarget) {
    const origTarget = initialPoints[lastIndex];
    const newPerp = axis === 'horizontal' ? shifted[lastIndex].y : shifted[lastIndex].x;
    const elbow: Point =
      axis === 'horizontal' ? { x: origTarget.x, y: newPerp } : { x: newPerp, y: origTarget.y };
    result = [...result.slice(0, lastIndex), elbow, { x: origTarget.x, y: origTarget.y }];
  }

  if (willAnchorSource) {
    const origSource = initialPoints[0];
    const newPerp = axis === 'horizontal' ? shifted[0].y : shifted[0].x;
    const elbow: Point =
      axis === 'horizontal' ? { x: origSource.x, y: newPerp } : { x: newPerp, y: origSource.y };
    result = [{ x: origSource.x, y: origSource.y }, elbow, ...result.slice(1)];
  }

  return result;
}
