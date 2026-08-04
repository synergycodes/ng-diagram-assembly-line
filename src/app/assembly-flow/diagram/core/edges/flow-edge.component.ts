import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  NgDiagramBaseEdgeComponent,
  NgDiagramBaseEdgeLabelComponent,
  NgDiagramModelService,
  type Edge,
  type NgDiagramEdgeTemplate,
  type Point,
} from 'ng-diagram';
import type { AssemblyNodeData, EdgeFlowState, EdgeType } from '../../../model';
import { AlarmFilterService } from '../../../services/alarm-filter.service';

interface FlowEdgeData {
  flowState?: EdgeFlowState;
  type?: EdgeType;
}

const MARKER_PIXEL_SPACING = 300;

interface ReworkMarker {
  id: string;
  pos: number;
  angle: number;
}

@Component({
  selector: 'app-flow-edge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgDiagramBaseEdgeComponent, NgDiagramBaseEdgeLabelComponent],
  templateUrl: './flow-edge.component.html',
  styleUrl: './flow-edge.component.scss',
})
export class FlowEdgeComponent implements NgDiagramEdgeTemplate {
  edge = input.required<Edge<FlowEdgeData>>();

  private readonly modelService = inject(NgDiagramModelService);
  private readonly alarmFilter = inject(AlarmFilterService);

  protected readonly state = computed<EdgeFlowState>(() => this.edge().data?.flowState ?? 'normal');
  protected readonly isRework = computed(
    () => this.edge().data?.type === 'rework' || this.edge().sourcePort === 'port-rework',
  );
  protected readonly isDimmed = computed(() => {
    if (!this.alarmFilter.active()) {
      return false;
    }
    // Touch the nodes signal so dimming re-evaluates when the live feed changes
    // an endpoint's status — getNodeEnds itself is a non-reactive map lookup.
    // With that dependency registered it resolves both ends in one O(1) call.
    this.modelService.nodes();
    const ends = this.modelService.getNodeEnds<AssemblyNodeData, AssemblyNodeData>(this.edge().id);
    if (!ends) {
      return true;
    }
    return (
      this.alarmFilter.isNodeDimmed(ends.source.id, ends.source.data.status) &&
      this.alarmFilter.isNodeDimmed(ends.target.id, ends.target.data.status)
    );
  });
  protected readonly markers = computed<ReworkMarker[]>(() => {
    if (!this.isRework()) {
      return [];
    }
    return this.computeMarkers(this.edge().points ?? []);
  });

  /**
   * Each marker carries its absolute flow position and a rotation matching the
   * segment's travel direction (path runs source→target; the base glyph points
   * left, hence −180°).
   */
  private computeMarkers(points: readonly Point[]): ReworkMarker[] {
    const segments: { length: number; start: number; angle: number }[] = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - 180;
      segments.push({ length, start: total, angle });
      total += length;
    }
    if (total === 0) {
      return [];
    }

    const count = Math.max(1, Math.floor(total / MARKER_PIXEL_SPACING));
    const markers: ReworkMarker[] = [];
    for (let i = 0; i < count; i++) {
      const pos = (i + 0.5) / count;
      const distance = pos * total;
      const segment = segments.find((s) => distance <= s.start + s.length) ?? segments.at(-1)!;
      markers.push({ id: `rework-marker-${i}`, pos, angle: segment.angle });
    }
    return markers;
  }
}
