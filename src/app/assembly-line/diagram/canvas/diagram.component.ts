import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import {
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
  type PaletteItemDroppedEvent,
  type SelectionChangedEvent,
  type SelectionMovedEvent,
} from 'ng-diagram';
import {
  AreaNodeComponent,
  AutoAssemblyNodeComponent,
  FlowEdgeComponent,
  AssemblyNodeComponent,
  PaintShopNodeComponent,
} from '../../shared';
import { NODE_TYPES, isAreaNode, type AssemblyNode } from '../../model';
import { DiagramStore } from '../../state/diagram-store.service';
import { ModeService } from '../../state/mode.service';
import { SelectionService } from '../../state/selection.service';
import { DiagramExportService } from '../../services/diagram-export';
import { EdgeReshapeOverlayComponent } from '../features/edge-reshape';
import { ASSEMBLY_LINE_CONFIG } from '../../assembly-line.config';
import { applyEdgeStretchOnSelectionMoved } from '../features/edge-routing';
import { ReworkRouting } from '../core/edges/rework-routing';
import { createDiagramConfig, fitPadding } from './diagram-config';
import { createReadOnlyMiddlewares } from './read-only.middleware';
import { fitAreaToChildren, fitAreaWhenReady } from './area-fit';
import { LiveFeedService } from './live-feed.service';

/**
 * Thin host for the ng-diagram canvas: registers node/edge templates, wires the
 * config, read-only guard and live feed, and mirrors the model into the store.
 * The substantive logic lives alongside in `diagram-config`, `read-only.middleware`,
 * `area-fit` and `live-feed.service`.
 */
@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent, EdgeReshapeOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LiveFeedService],
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
  private readonly appConfig = inject(ASSEMBLY_LINE_CONFIG);

  private readonly feed = inject(LiveFeedService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly exportService = inject(DiagramExportService);
  readonly rightPanelCollapsed = input<boolean>(false);

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

  protected readonly config = computed(() => createDiagramConfig(this.mode(), this.appConfig));

  protected readonly middlewares = createReadOnlyMiddlewares(() => this.mode() === 'monitor');

  protected readonly model = initializeModel({
    nodes: this.store.nodes(),
    edges: this.store.edges(),
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
    // reads inside. The live feed only runs in monitor mode.
    effect(() => {
      const monitoring = this.mode() === 'monitor';
      untracked(() => {
        if (!monitoring) {
          this.feed.stop();
          return;
        }
        const nodeIds = this.modelService.nodes().map((node) => node.id);
        this.feed.start(nodeIds);
      });
    });

    effect(() => {
      const mode = this.mode();
      untracked(() => {
        if (mode === 'monitor') {
          const rightCollapsed = this.rightPanelCollapsed();
          requestAnimationFrame(() =>
            this.viewport.zoomToFit({ padding: fitPadding(mode, this.appConfig, rightCollapsed) }),
          );
        }
      });
    });

    this.destroyRef.onDestroy(() => this.feed.stop());

    // Expose the diagram host element so the header's export menu can capture it.
    this.exportService.setDiagramElement(this.elementRef);
    this.destroyRef.onDestroy(() => this.exportService.clearDiagramElement());
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
      // Children are usually already measured here — the poll is a defensive retry.
      fitAreaWhenReady(this.modelService, targetGroup.id, this.appConfig.area);
    }
  }

  async onPaletteItemDropped(event: PaletteItemDroppedEvent) {
    const explicitGroupId = event.node.groupId;
    if (explicitGroupId) {
      // The drop mutation was the library's — nothing to await; see fitAreaWhenReady.
      fitAreaWhenReady(this.modelService, explicitGroupId, this.appConfig.area);
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
    fitAreaToChildren(this.modelService, area.id, this.appConfig.area);
  }
}
