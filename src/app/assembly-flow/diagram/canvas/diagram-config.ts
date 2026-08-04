import type { Edge, NgDiagramConfig } from 'ng-diagram';
import type { AppMode } from '../../state/mode.service';
import { REWORK_ROUTING_NAME } from '../core/edges/rework-routing';

/**
 * Builds the ng-diagram configuration for the current app mode. Monitor mode is
 * locked down (no dragging/resize/linking); edit mode adds grid snapping and the
 * rework-edge builder. Routing, background and zoom-to-fit are shared by both.
 */
export function createDiagramConfig(mode: AppMode): NgDiagramConfig {
  // Orthogonal (right-angle) routing suits conveyor flows and gives the
  // edge-reshape feature straight segments to drag. Applied in both modes.
  const edgeRouting = {
    defaultRouting: 'orthogonal',
    orthogonal: { maxCornerRadius: 0 },
  } as const;

  // Snap node drag/resize to a 20px grid, matched to the background dot
  // spacing so nodes align to the visible dots. (Distinct from geometry's
  // GRID=8 reshape snap.)
  const CANVAS_SNAP_PX = 20;
  const background = { dotSpacing: CANVAS_SNAP_PX };
  const zoom = { zoomToFit: { onInit: true } };
  const snapping = {
    shouldSnapDragForNode: () => true,
    computeSnapForNodeDrag: () => ({ width: CANVAS_SNAP_PX, height: CANVAS_SNAP_PX }),
    shouldSnapResizeForNode: () => true,
    computeSnapForNodeSize: () => ({ width: CANVAS_SNAP_PX, height: CANVAS_SNAP_PX }),
  };

  if (mode === 'monitor') {
    return {
      nodeDraggingEnabled: false,
      resize: { defaultResizable: false },
      linking: { validateConnection: () => false },
      edgeRouting,
      background,
      zoom,
    };
  }
  return {
    edgeRouting,
    background,
    snapping,
    zoom,
    linking: {
      finalEdgeDataBuilder: (edge: Edge) => {
        if (edge.sourcePort === 'port-rework') {
          return {
            ...edge,
            type: 'flow',
            routing: REWORK_ROUTING_NAME,
            data: { ...(edge.data ?? {}), type: 'rework' },
          };
        }
        return { ...edge, type: edge.type ?? 'flow' };
      },
    },
  };
}
