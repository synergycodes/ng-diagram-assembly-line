import type { Edge, NgDiagramConfig } from 'ng-diagram';
import type { AppMode } from '../../state/mode.service';
import type { AssemblyLineConfig } from '../../assembly-line.config';
import { REWORK_ROUTING_NAME } from '../core/edges/rework-routing';

/**
 * Builds the ng-diagram configuration for the current app mode. Monitor mode is
 * locked down (no dragging/resize/linking); edit mode adds grid snapping and the
 * rework-edge builder. Routing, background and zoom-to-fit are shared by both.
 */
export function createDiagramConfig(mode: AppMode, config: AssemblyLineConfig): NgDiagramConfig {
  // Orthogonal (right-angle) routing suits conveyor flows and gives the
  // edge-reshape feature straight segments to drag. Applied in both modes.
  const edgeRouting = {
    defaultRouting: 'orthogonal',
    orthogonal: { maxCornerRadius: 0 },
  } as const;

  // Snap node drag/resize to the grid, matched to the background dot spacing so
  // nodes align to the visible dots. (Distinct from geometry's GRID=8 reshape snap.)
  const snapPx = config.snapping.gridSize;
  const background = { dotSpacing: snapPx };
  const zoom = { zoomToFit: { onInit: true } };
  const snapping = {
    shouldSnapDragForNode: () => true,
    computeSnapForNodeDrag: () => ({ width: snapPx, height: snapPx }),
    shouldSnapResizeForNode: () => true,
    computeSnapForNodeSize: () => ({ width: snapPx, height: snapPx }),
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
