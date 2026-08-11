import type { NgDiagramModelService, Point } from 'ng-diagram';
import { portWorldPosition } from '../../core/geometry/port-position';
import { clonePoint, clonePoints } from '../../core/geometry/point';
import { stretchPolylineWithBendInsertion } from '../../core/geometry/edge-stretch';

// Skips edges not incident to `movedNodeIds` before the per-edge probe
// (O(incident), not O(all)). Auto edges are re-routed by ng-diagram's
// orthogonal router.
export function applyEdgeStretchOnSelectionMoved(
  modelService: NgDiagramModelService,
  movedNodeIds: ReadonlySet<string>,
): void {
  const patches: { id: string; points: Point[] }[] = [];
  // Committed model, not the edges() signal — safe when a caller runs this
  // right after an awaited edge write, which the signal won't show yet.
  for (const edge of modelService.getModel().getEdges()) {
    if (edge.routingMode !== 'manual') {
      continue;
    }
    if (!edge.points || edge.points.length < 2) {
      continue;
    }
    if (!movedNodeIds.has(edge.source) && !movedNodeIds.has(edge.target)) {
      continue;
    }

    const liveSource = liveEndpointWorld(
      modelService,
      edge.source,
      edge.sourcePort,
      edge.sourcePosition,
    );
    const liveTarget = liveEndpointWorld(
      modelService,
      edge.target,
      edge.targetPort,
      edge.targetPosition,
    );
    const oldSource = edge.points[0];
    const oldTarget = edge.points[edge.points.length - 1];

    const sourceDrifted =
      !!liveSource &&
      (Math.abs(liveSource.x - oldSource.x) > 0.5 || Math.abs(liveSource.y - oldSource.y) > 0.5);
    const targetDrifted =
      !!liveTarget &&
      (Math.abs(liveTarget.x - oldTarget.x) > 0.5 || Math.abs(liveTarget.y - oldTarget.y) > 0.5);
    if (!sourceDrifted && !targetDrifted) {
      continue;
    }

    const stretched = stretchPolylineWithBendInsertion(
      edge.points,
      sourceDrifted ? liveSource : null,
      targetDrifted ? liveTarget : null,
    );
    if (stretched) {
      patches.push({ id: edge.id, points: stretched });
    } else {
      // Can't stay orthogonal: keep the edge manual and re-anchor the drifted
      // endpoint(s) rather than discarding the reshape by flipping to auto.
      const kept = clonePoints(edge.points);
      if (sourceDrifted && liveSource) {
        kept[0] = clonePoint(liveSource);
      }
      if (targetDrifted && liveTarget) {
        kept[kept.length - 1] = clonePoint(liveTarget);
      }
      patches.push({ id: edge.id, points: kept });
    }
  }
  if (patches.length > 0) {
    modelService.updateEdges(patches);
  }
}

// Returns null when the port isn't measured yet (transient mount state).
function liveEndpointWorld(
  modelService: NgDiagramModelService,
  nodeId: string,
  portId: string | undefined,
  fallback: Point | undefined,
): Point | null {
  if (nodeId && portId) {
    const node = modelService.getNodeById(nodeId);
    return portWorldPosition(node ?? null, portId);
  }
  return fallback ? clonePoint(fallback) : null;
}
