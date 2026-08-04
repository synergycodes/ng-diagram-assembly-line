import type { Edge, Node, Point } from 'ng-diagram';
import { portWorldPosition } from '../../../diagram/core/geometry/port-position';

/**
 * Resolves the polyline actually drawn on screen for each edge, so the DXF
 * matches what ng-diagram rendered.
 *
 * Every edge's route lives in `edge.points`: forward `flow` edges route
 * orthogonally and rework loop-backs route through the registered `ReworkRouting`.
 * In both cases ng-diagram computes the path and writes it into `edge.points` on
 * the model (auto mode), and keeps it there after a manual reshape — so the
 * exporter reads those points as-is and never re-derives geometry. The
 * straight-segment branch is only a defensive fallback for an edge the model has
 * not routed yet.
 */

type EdgeWithData = Edge & { data?: { type?: string } };

/** True when an edge is a rework loop-back (matches `FlowEdgeComponent.isRework`). */
export function isReworkEdge(edge: Edge): boolean {
  const data = (edge as EdgeWithData).data;
  return data?.type === 'rework' || edge.sourcePort === 'port-rework';
}

/** The path drawn for `edge`, in diagram coordinates. Empty if it can't be resolved. */
export function resolveEdgePoints(edge: Edge, nodes: readonly Node[]): Point[] {
  if (edge.points && edge.points.length >= 2) {
    return edge.points;
  }
  // No routed points on the model yet — fall back to a straight segment between
  // the endpoints so the edge still exports.
  const source = endpointPoint(edge, nodes, 'source');
  const target = endpointPoint(edge, nodes, 'target');
  return source && target ? [source, target] : (edge.points ?? []);
}

/**
 * World position of an edge endpoint: the routed endpoint if ng-diagram has
 * one, else the measured port anchor, else the node's bbox centre.
 */
function endpointPoint(
  edge: Edge,
  nodes: readonly Node[],
  side: 'source' | 'target',
): Point | null {
  const explicit = side === 'source' ? edge.sourcePosition : edge.targetPosition;
  if (explicit) {
    return explicit;
  }
  const nodeId = side === 'source' ? edge.source : edge.target;
  const portId = side === 'source' ? edge.sourcePort : edge.targetPort;
  const node = nodes.find((candidate) => candidate.id === nodeId) ?? null;
  if (!node) {
    return null;
  }
  if (portId) {
    const anchor = portWorldPosition(node, portId);
    if (anchor) {
      return anchor;
    }
  }
  const size = node.size ?? { width: 0, height: 0 };
  return { x: node.position.x + size.width / 2, y: node.position.y + size.height / 2 };
}
