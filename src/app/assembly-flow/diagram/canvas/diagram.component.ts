import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
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
  NgDiagramService,
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
  type AssemblyNode,
  type AssemblyNodeData,
  type DataUpdate,
} from '../../model';
import { DiagramStore } from '../../state/diagram-store.service';
import { ModeService } from '../../state/mode.service';
import { SelectionService } from '../../state/selection.service';
import { DataConnectionService } from '../../state/data-connection.service';
import { DiagramExportService } from '../../services/diagram-export';
import { EdgeReshapeOverlayComponent } from '../features/edge-reshape';
import { applyEdgeStretchOnSelectionMoved } from '../features/edge-routing';
import { REWORK_ROUTING_NAME, ReworkRouting } from '../core/edges/rework-routing';

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
  private readonly diagramService = inject(NgDiagramService);
  private readonly groupsService = inject(NgDiagramGroupsService);
  private readonly viewport = inject(NgDiagramViewportService);
  protected readonly mode = inject(ModeService).mode;
  private readonly dataConnection = inject(DataConnectionService);
  private readonly history = inject(HistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly exportService = inject(DiagramExportService);

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

    // Expose the diagram host element so the header's export menu can capture it.
    this.exportService.setDiagramElement(this.elementRef);
    this.destroyRef.onDestroy(() => this.exportService.clearDiagramElement());
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

  onDiagramInit() {
    this.diagramService.registerRouting(new ReworkRouting());
  }

  onSelectionChanged(event: SelectionChangedEvent) {
    const firstNode = event.selectedNodes?.[0];
    this.selection.select(firstNode?.id ?? null);
  }

  /**
   * Keep manual-routed (reshaped) edges attached to their ports while a
   * connected node — or an Area group and its children — is dragged. ng-diagram
   * re-routes only `auto` edges on a move, so without this a reshaped edge would
   * detach. Expands moved ids to include every descendant (getChildrenNested, so
   * nested Areas are covered too) so child-incident edges re-anchor when their
   * Area moves.
   */
  onSelectionMoved(event: SelectionMovedEvent) {
    const movedIds = new Set<string>();
    for (const node of event.nodes) {
      movedIds.add(node.id);
      for (const child of this.modelService.getChildrenNested(node.id)) {
        movedIds.add(child.id);
      }
    }
    applyEdgeStretchOnSelectionMoved(this.modelService, movedIds);
  }

  onGroupMembershipChanged(event: GroupMembershipChangedEvent) {
    for (const { targetGroup } of event.grouped) {
      // Children are usually measured by the time membership settles, so this
      // fits on the first pass; the rAF poll inside is only a defensive retry.
      this.fitAreaWhenReady(targetGroup.id);
    }
  }

  async onPaletteItemDropped(event: PaletteItemDroppedEvent) {
    const explicitGroupId = event.node.groupId;
    if (explicitGroupId) {
      // The library added the node to the group before this event fired, so
      // there is no mutation of ours to wrap — poll until the child is measured.
      this.fitAreaWhenReady(explicitGroupId);
      return;
    }
    const area = this.modelService.getNodesInRange(event.dropPosition, 1).find(isAreaNode);
    if (!area) {
      return;
    }
    // Auto-join: we own the mutation, so wrap it in a transaction that resolves
    // only once the added child is measured — the fit then reads a real size and
    // needs no polling.
    await this.diagramService.transaction(
      () => {
        this.groupsService.addToGroup(area.id, [event.node.id]);
      },
      { waitForMeasurements: true },
    );
    this.fitAreaToChildren(area.id);
  }

  /**
   * Defensive fallback for the drop paths where we can't await measurements
   * (a direct drop into a group, whose mutation the library already made): retry
   * the fit across a few frames until the children report a measured size.
   */
  private fitAreaWhenReady(groupId: string, attempt = 0) {
    if (this.fitAreaToChildren(groupId) || attempt > 10) {
      return;
    }
    requestAnimationFrame(() => this.fitAreaWhenReady(groupId, attempt + 1));
  }

  /**
   * Grow the Area to enclose its children (never shrinks). Returns `false` only
   * when a child has no measured size yet, so callers can retry; `true` once the
   * fit has been applied — or there was nothing to fit.
   */
  private fitAreaToChildren(groupId: string): boolean {
    const group = this.modelService.getNodeById<AssemblyNodeData>(groupId);
    if (group?.type !== NODE_TYPES.AREA || !group.size) {
      return true;
    }

    const children = this.modelService.getChildren(groupId);
    if (!children.length) {
      return true;
    }
    if (children.some((child) => child.size === undefined)) {
      return false;
    }

    // Union of the group's current rect with each child's padded rect. Seeding
    // from the group's own edges is what keeps the Area from ever shrinking.
    // (NB: `computePartsBounds` is unusable here — it unions with an origin
    // sentinel for the empty edge list, dragging a subset's bounds back to 0,0.)
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
      return true;
    }

    this.modelService.updateNode(groupId, {
      position: { x: left, y: top },
      size: { width: newWidth, height: newHeight },
      autoSize: false,
    });
    return true;
  }
}
