import type { Edge, NgDiagramConfig } from 'ng-diagram';
import type { AppMode } from '../../state/mode.service';
import type { AssemblyLineConfig } from '../../assembly-line.config';
import { REWORK_ROUTING_NAME } from '../core/edges/rework-routing';

/**
 * Padding (screen px, `[top, right, bottom, left]`) that keeps zoom-to-fit content
 * inside the visible canvas gap between the floating panels rather than underneath
 * them. Reads the chrome dimensions from the app config (the single source of truth
 * shared with the page shell's CSS). The palette (left) only exists in edit mode, so
 * its inset drops to a plain margin in monitor mode.
 */
export function fitPadding(
  mode: AppMode,
  config: AssemblyLineConfig,
): [number, number, number, number] {
  const { gap, headerHeight, leftPanelWidth, rightPanelWidth } = config.layout;
  const top = gap + headerHeight + gap;
  const right = gap + rightPanelWidth + gap;
  const bottom = gap;
  const left = mode === 'edit' ? gap + leftPanelWidth + gap : gap;
  return [top, right, bottom, left];
}

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
  const zoom = { zoomToFit: { onInit: true, padding: fitPadding(mode, config) } };
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
