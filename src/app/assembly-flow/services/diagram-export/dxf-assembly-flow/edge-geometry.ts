import type { Edge, Node, Point } from 'ng-diagram';
import { portWorldPosition } from '../../../diagram/core/geometry/port-position';
import { REWORK_CLEARANCE } from './assembly-dxf-constants';

/**
 * Resolves the polyline actually drawn on screen for each edge, so the DXF
 * matches what ng-diagram rendered.
 *
 * Forward `flow` edges route orthogonally and ng-diagram writes their route
 * into `edge.points`, so those are used as-is. Rework loop-backs, however, are
 * routed *by the FlowEdgeComponent itself* as a manual rectangular detour below
 * the machines (`computeReworkDetour`) — the model's `edge.points` still holds
 * the auto orthogonal route that would cut through the nodes in between. This
 * module re-derives that detour with the same geometry so the export reflects
 * the rendered loop rather than the stale model route.
 */

type EdgeWithData = Edge & { data?: { type?: string } };

/** True when an edge is a rework loop-back (matches `FlowEdgeComponent.isRework`). */
export function isReworkEdge(edge: Edge): boolean {
  const data = (edge as EdgeWithData).data;
  return data?.type === 'rework' || edge.sourcePort === 'port-rework';
}

/** The path drawn for `edge`, in diagram coordinates. Empty if it can't be resolved. */
export function resolveEdgePoints(edge: Edge, nodes: readonly Node[]): Point[] {
  if (isReworkEdge(edge)) {
    const source = endpointPoint(edge, nodes, 'source');
    const target = endpointPoint(edge, nodes, 'target');
    return source && target
      ? computeReworkDetour(source, target, edge, nodes)
      : (edge.points ?? []);
  }

  if (edge.points && edge.points.length >= 2) {
    return edge.points;
  }
  // No routed points yet — fall back to a straight segment between the endpoints.
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

/**
 * Rectangular detour below the machines — a verbatim port of
 * `FlowEdgeComponent.computeReworkDetour`: exit right from the rework port, drop
 * to a channel clear of both endpoint nodes, run across, and approach the target
 * from its left.
 */
function computeReworkDetour(
  source: Point,
  target: Point,
  edge: Edge,
  nodes: readonly Node[],
): Point[] {
  const endpointIds = new Set([edge.source, edge.target]);
  let channelY = Math.max(source.y, target.y);
  for (const node of nodes) {
    if (!endpointIds.has(node.id) || !node.size) {
      continue;
    }
    channelY = Math.max(channelY, node.position.y + node.size.height);
  }
  channelY += REWORK_CLEARANCE;

  const exitX = source.x + REWORK_CLEARANCE; // port-rework sits on the node's right
  const approachX = target.x - REWORK_CLEARANCE; // port-left is approached from the left
  return [
    { x: source.x, y: source.y },
    { x: exitX, y: source.y },
    { x: exitX, y: channelY },
    { x: approachX, y: channelY },
    { x: approachX, y: target.y },
    { x: target.x, y: target.y },
  ];
}
