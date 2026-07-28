import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import {
  createMiddlewares,
  initializeModel,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramGroupsService,
  NgDiagramEdgeTemplateMap,
  NgDiagramModelService,
  NgDiagramNodeTemplateMap,
  NgDiagramViewportService,
  type Edge,
  type GroupMembershipChangedEvent,
  type Middleware,
  type NgDiagramConfig,
  type Node,
  type PaletteItemDroppedEvent,
  type SelectionChangedEvent,
  type SelectionMovedEvent,
} from 'ng-diagram';
import {
  AreaNodeComponent,
  AutoAssemblyNodeComponent,
  FlowEdgeComponent,
  HistoryService,
  AssemblyNodeComponent,
  PaintShopNodeComponent,
} from '../../shared';
import {
  NODE_TYPES,
  getPropertyMeta,
  isAreaNode,
  type AreaNode,
  type AssemblyNode,
  type AssemblyNodeData,
  type DataUpdate,
} from '../../model';
import { DiagramStore } from '../../state/diagram-store.service';
import { ModeService } from '../../state/mode.service';
import { SelectionService } from '../../state/selection.service';
import { DataConnectionService } from '../../state/data-connection.service';
import { EdgeReshapeOverlayComponent } from '../features/edge-reshape';
import { applyEdgeStretchOnSelectionMoved } from '../features/edge-routing';
import { pointInRect } from '../core/geometry/point';

const AREA_PADDING = 16;
const AREA_PADDING_TOP = 28;

/**
 * Model actions blocked while the diagram is read-only (monitor mode) — every
 * user-driven structural edit. Notably absent: `updateNode`/`updateNodes` (the
 * live data-bus feed applies metrics through them), plus selection and viewport/
 * zoom, which stay enabled so the monitor remains navigable and inspectable.
 */
const READ_ONLY_BLOCKED_ACTIONS = new Set<string>([
  'moveNodesBy',
  'moveNodes',
  'moveNodesStart',
  'moveNodesStop',
  'deleteSelection',
  'deleteNodes',
  'deleteEdges',
  'deleteElements',
  'addNodes',
  'addEdges',
  'paletteDropNode',
  'paste',
  'clearModel',
  'updateEdge',
  'resizeNode',
  'resizeNodeStart',
  'resizeNodeStop',
  'startLinking',
  'moveTemporaryEdge',
  'finishLinking',
  'rotateNodeTo',
  'rotateNodeStart',
  'rotateNodeStop',
  'changeZOrder',
]);

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent, EdgeReshapeOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.scss',
})
export class DiagramComponent {
  private readonly store = inject(DiagramStore);
  private readonly selection = inject(SelectionService);
  private readonly modelService = inject(NgDiagramModelService);
  private readonly groupsService = inject(NgDiagramGroupsService);
  private readonly viewport = inject(NgDiagramViewportService);
  protected readonly mode = inject(ModeService).mode;
  private readonly dataConnection = inject(DataConnectionService);
  private readonly history = inject(HistoryService);
  private readonly destroyRef = inject(DestroyRef);

  private feedSub?: Subscription;

  protected readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    [NODE_TYPES.AREA, AreaNodeComponent],
    [NODE_TYPES.BUFFER, AssemblyNodeComponent],
    [NODE_TYPES.SERVO_PRESS, AssemblyNodeComponent],
    [NODE_TYPES.WELDING_CELL, AssemblyNodeComponent],
    [NODE_TYPES.QUALITY_CONTROL, AssemblyNodeComponent],
    [NODE_TYPES.PAINT_SHOP, PaintShopNodeComponent],
    [NODE_TYPES.AUTO_ASSEMBLY, AutoAssemblyNodeComponent],
  ]);
  protected readonly edgeTemplateMap = new NgDiagramEdgeTemplateMap([['flow', FlowEdgeComponent]]);
  protected readonly config = computed<NgDiagramConfig>(() => {
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

    if (this.mode() === 'monitor') {
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
            return { ...edge, type: 'flow', data: { ...(edge.data ?? {}), type: 'rework' } };
          }
          return { ...edge, type: edge.type ?? 'flow' };
        },
      },
    };
  });

  /**
   * Read-only guard: in monitor mode the diagram is view-only, so every
   * user structural edit is cancelled before it reaches the model. Runs ahead of
   * the default chain; live data-bus updates (`updateNode`) are not in the block
   * set, so they still flow through.
   */
  protected readonly middlewares = createMiddlewares((defaults) => [
    {
      name: 'read-only-monitor',
      execute: (context, next, cancel) => {
        if (
          this.mode() === 'monitor' &&
          context.modelActionTypes.some((action) => READ_ONLY_BLOCKED_ACTIONS.has(action))
        ) {
          cancel();
          return;
        }
        next();
      },
    } satisfies Middleware,
    ...defaults,
  ]);

  protected readonly model = initializeModel({
    nodes: this.store.nodes() as Node<AssemblyNodeData>[],
    edges: this.store.edges() as Edge[],
  });

  constructor() {
    effect(() => {
      const nodes = this.modelService.nodes() as AssemblyNode[];
      untracked(() => this.store.setNodes(nodes));
    });
    effect(() => {
      const edges = this.modelService.edges() as Edge[];
      untracked(() => this.store.setEdges(edges));
    });

    // `untracked` keeps this effect keyed on `mode()` only — not on the model
    // reads inside.
    effect(() => {
      const monitoring = this.mode() === 'monitor';
      untracked(() => {
        this.feedSub?.unsubscribe();
        this.feedSub = undefined;
        if (!monitoring) {
          return;
        }
        const nodeIds = this.modelService.nodes().map((node) => node.id);
        this.feedSub = this.dataConnection
          .updatesFor(nodeIds)
          .subscribe((update) => this.applyUpdate(update));
      });
    });

    effect(() => {
      const monitoring = this.mode() === 'monitor';
      untracked(() => {
        if (monitoring) {
          // use requestAnimationFrame so that diagram viewport is updated after palette gets hidden
          requestAnimationFrame(() => this.viewport.zoomToFit());
        }
      });
    });

    this.destroyRef.onDestroy(() => this.feedSub?.unsubscribe());
  }

  private applyUpdate(update: DataUpdate): void {
    const current = this.modelService.getNodeById<AssemblyNodeData>(update.nodeId);
    if (!current) {
      return;
    }

    this.modelService.updateNodeData<AssemblyNodeData>(update.nodeId, {
      ...current.data,
      status: update.status,
      ...(update.metrics as Partial<AssemblyNodeData>),
    } as AssemblyNodeData);

    const numeric: Record<string, number> = {};
    for (const meta of getPropertyMeta(update.type)) {
      if (!meta.numeric) {
        continue;
      }
      const value = update.metrics[meta.key];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        numeric[meta.key] = value;
      }
    }
    if (Object.keys(numeric).length) {
      this.history.pushTick(update.nodeId, numeric);
    }
  }

  onSelectionChanged(event: SelectionChangedEvent) {
    const firstNode = event.selectedNodes?.[0];
    this.selection.select(firstNode?.id ?? null);
  }

  /**
   * Keep manual-routed (reshaped) edges attached to their ports while a
   * connected node — or an Area group and its children — is dragged. ng-diagram
   * re-routes only `auto` edges on a move, so without this a reshaped edge would
   * detach. Expands moved ids to include group children so child-incident edges
   * re-anchor when their Area moves.
   */
  onSelectionMoved(event: SelectionMovedEvent) {
    const movedIds = new Set<string>();
    for (const node of event.nodes) {
      movedIds.add(node.id);
      for (const child of this.modelService.getChildren(node.id)) {
        movedIds.add(child.id);
      }
    }
    applyEdgeStretchOnSelectionMoved(this.modelService, movedIds);
  }

  onGroupMembershipChanged(event: GroupMembershipChangedEvent) {
    for (const { targetGroup } of event.grouped) {
      this.fitAreaWhenReady(targetGroup.id);
    }
  }

  onPaletteItemDropped(event: PaletteItemDroppedEvent) {
    const explicitGroupId = event.node.groupId;
    if (explicitGroupId) {
      this.fitAreaWhenReady(explicitGroupId);
      return;
    }
    const area = this.findAreaContainingPoint(event.dropPosition);
    if (!area) {
      return;
    }
    this.groupsService.addToGroup(area.id, [event.node.id]);
    this.fitAreaWhenReady(area.id);
  }

  private fitAreaWhenReady(groupId: string, attempt = 0) {
    const children = this.modelService.getChildren(groupId);
    const ready = children.length > 0 && children.every((c) => c.size !== undefined);
    if (ready || attempt > 30) {
      this.fitAreaToChildren(groupId);
      return;
    }
    requestAnimationFrame(() => this.fitAreaWhenReady(groupId, attempt + 1));
  }

  private findAreaContainingPoint(point: { x: number; y: number }): AreaNode | null {
    const nodes = this.modelService.nodes() as AssemblyNode[];
    for (const n of nodes) {
      if (!isAreaNode(n) || !n.size) {
        continue;
      }
      const within = pointInRect(point, {
        x: n.position.x,
        y: n.position.y,
        width: n.size.width,
        height: n.size.height,
      });
      if (within) {
        return n;
      }
    }
    return null;
  }

  private fitAreaToChildren(groupId: string) {
    const group = this.modelService.getNodeById<AssemblyNodeData>(groupId);
    if (!group?.size) {
      return;
    }
    if (group.type !== NODE_TYPES.AREA) {
      return;
    }

    const children = this.modelService.getChildren(groupId);
    if (!children.length) {
      return;
    }

    let left = group.position.x;
    let top = group.position.y;
    let right = left + group.size.width;
    let bottom = top + group.size.height;

    for (const child of children) {
      if (!child.size) {
        continue;
      }
      const cLeft = child.position.x - AREA_PADDING;
      const cTop = child.position.y - AREA_PADDING_TOP;
      const cRight = child.position.x + child.size.width + AREA_PADDING;
      const cBottom = child.position.y + child.size.height + AREA_PADDING;
      if (cLeft < left) {
        left = cLeft;
      }
      if (cTop < top) {
        top = cTop;
      }
      if (cRight > right) {
        right = cRight;
      }
      if (cBottom > bottom) {
        bottom = cBottom;
      }
    }

    const newWidth = right - left;
    const newHeight = bottom - top;
    if (
      left === group.position.x &&
      top === group.position.y &&
      newWidth === group.size.width &&
      newHeight === group.size.height
    ) {
      return;
    }

    this.modelService.updateNode(groupId, {
      position: { x: left, y: top },
      size: { width: newWidth, height: newHeight },
      autoSize: false,
    });
  }
}
