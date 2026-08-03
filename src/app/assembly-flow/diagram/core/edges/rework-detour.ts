import type { Point } from 'ng-diagram';
import { REWORK_NODE_CLEARANCE, REWORK_PORT_STANDOFF } from '../geometry/constants';

/**
 * The rectangular rework loop-back below the machines: exit right from the rework
 * port, drop below the connected nodes, run back across, and approach the target
 * from its left. `machineBottoms` are the world-space bottom edges the loop must
 * clear (the two endpoint nodes).
 *
 * Shared by `ReworkRouting` (the on-screen route) and the DXF exporter so the two
 * can't drift.
 */
export function reworkDetourPoints(
  source: Point,
  target: Point,
  machineBottoms: readonly number[],
): Point[] {
  const runY = Math.max(source.y, target.y, ...machineBottoms) + REWORK_NODE_CLEARANCE;
  const exitX = source.x + REWORK_PORT_STANDOFF; // port-rework sits on the node's right
  const approachX = target.x - REWORK_PORT_STANDOFF; // port-left is approached from the left
  return [
    { x: source.x, y: source.y },
    { x: exitX, y: source.y },
    { x: exitX, y: runY },
    { x: approachX, y: runY },
    { x: approachX, y: target.y },
    { x: target.x, y: target.y },
  ];
}
