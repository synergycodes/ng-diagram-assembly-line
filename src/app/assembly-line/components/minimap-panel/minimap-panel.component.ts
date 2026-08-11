import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NgDiagramMinimapComponent,
  NgDiagramModelService,
  NgDiagramViewportService,
} from 'ng-diagram';
import { IconComponent } from '../../shared/icon/icon.component';
import { ASSEMBLY_LINE_CONFIG } from '../../assembly-line.config';

const DEFER_NODE_THRESHOLD = 200;

@Component({
  selector: 'app-minimap-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgDiagramMinimapComponent, IconComponent],
  templateUrl: './minimap-panel.component.html',
  styleUrl: './minimap-panel.component.scss',
})
export class MinimapPanelComponent {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly viewport = inject(NgDiagramViewportService);
  private readonly zoomStep = inject(ASSEMBLY_LINE_CONFIG).viewport.zoomStep;

  protected readonly isReady = signal(false);
  protected readonly isExpanded = signal(false);
  protected readonly canZoomIn = this.viewport.canZoomIn;
  protected readonly canZoomOut = this.viewport.canZoomOut;
  protected readonly zoomPercent = computed(() => `${Math.round(this.viewport.scale() * 100)}%`);
  protected readonly deferNodeUpdates = computed(
    () => this.modelService.nodes().length >= DEFER_NODE_THRESHOLD,
  );

  constructor() {
    afterNextRender(() => this.isReady.set(true));
  }

  protected zoomIn(): void {
    const scale = this.viewport.scale();
    this.viewport.zoom((scale + this.zoomStep) / scale);
  }

  protected zoomOut(): void {
    const scale = this.viewport.scale();
    this.viewport.zoom((scale - this.zoomStep) / scale);
  }

  protected toggleExpanded(): void {
    this.isExpanded.update((expanded) => !expanded);
  }
}
