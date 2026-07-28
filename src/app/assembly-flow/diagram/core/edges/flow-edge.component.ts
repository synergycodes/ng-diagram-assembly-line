import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  NgDiagramBaseEdgeComponent,
  NgDiagramBaseEdgeLabelComponent,
  NgDiagramModelService,
  type Edge,
  type NgDiagramEdgeTemplate,
  type Point,
} from 'ng-diagram';
import { isAreaNode } from '../../../model';
import type { AssemblyNode, AssemblyNodeData, EdgeFlowState, EdgeType } from '../../../model';
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
  position: Point;
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
  private readonly geometry = computed(() => {
    const edge = this.edge();
    const source = edge.sourcePosition;
    const target = edge.targetPosition;
    if (!this.isRework() || !source || !target) {
      return null;
    }
    const points = this.computeReworkDetour(source, target);
    return { points, markers: this.computeMarkers(points) };
  });

  protected readonly state = computed<EdgeFlowState>(() => this.edge().data?.flowState ?? 'normal');
  protected readonly isRework = computed(
    () => this.edge().data?.type === 'rework' || this.edge().sourcePort === 'port-rework',
  );
  protected readonly isDimmed = computed(() => {
    if (!this.alarmFilter.active()) {
      return false;
    }
    const edge = this.edge();
    const nodes = this.modelService.nodes();
    const endpointDimmed = (nodeId: string): boolean => {
      const node = nodes.find((n) => n.id === nodeId);
      return node
        ? this.alarmFilter.isNodeDimmed(node.id, (node.data as AssemblyNodeData).status)
        : true;
    };
    return endpointDimmed(edge.source) && endpointDimmed(edge.target);
  });
  protected readonly markers = computed<ReworkMarker[]>(() => this.geometry()?.markers ?? []);

  /**
   * Rework edges loop from a QC node's right-hand `port-rework` back to an
   * upstream node's left port — an auto path would cut straight through the
   * nodes in between — so we route them manually as a rectangular detour below
   * the machines.
   *
   * The chevron positions are injected as `measuredLabels` (rather than left to
   * ng-diagram's label pipeline, which only re-runs on endpoint moves) so they
   * track the detour whenever it re-computes — including node resizes mid-loop.
   */
  protected readonly routedEdge = computed<Edge<FlowEdgeData>>(() => {
    const edge = this.edge();
    const geo = this.geometry();
    if (!geo) {
      return edge;
    }
    return {
      ...edge,
      routing: 'polyline',
      routingMode: 'manual',
      points: geo.points,
      measuredLabels: geo.markers.map((marker) => ({
        id: marker.id,
        positionOnEdge: marker.pos,
        position: marker.position,
      })),
    };
  });

  private computeReworkDetour(source: Point, target: Point): Point[] {
    const CLEARANCE = 20;

    const spanMinX = Math.min(source.x, target.x);
    const spanMaxX = Math.max(source.x, target.x);

    // Area (group) nodes are skipped so the loop clears the machines inside the
    // shop, not the whole shop container.
    let channelY = Math.max(source.y, target.y);
    for (const node of this.modelService.nodes() as AssemblyNode[]) {
      if (isAreaNode(node)) {
        continue;
      }
      const size = node.size;
      if (!size) {
        continue;
      }
      const left = node.position.x;
      if (left + size.width < spanMinX || left > spanMaxX) {
        continue;
      }
      channelY = Math.max(channelY, node.position.y + size.height);
    }
    channelY += CLEARANCE;

    const exitX = source.x + CLEARANCE; // port-rework sits on the node's right
    const approachX = target.x - CLEARANCE; // port-left is approached from the left
    return [
      { x: source.x, y: source.y },
      { x: exitX, y: source.y },
      { x: exitX, y: channelY },
      { x: approachX, y: channelY },
      { x: approachX, y: target.y },
      { x: target.x, y: target.y },
    ];
  }

  /**
   * Each marker carries its absolute flow position and a rotation matching the
   * segment's travel direction (path runs source→target; the base glyph points
   * left, hence −180°).
   */
  private computeMarkers(points: Point[]): ReworkMarker[] {
    const segments: { a: Point; b: Point; length: number; start: number }[] = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      segments.push({ a, b, length, start: total });
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
      const t = segment.length === 0 ? 0 : (distance - segment.start) / segment.length;
      const position = {
        x: segment.a.x + (segment.b.x - segment.a.x) * t,
        y: segment.a.y + (segment.b.y - segment.a.y) * t,
      };
      const angle =
        (Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x) * 180) / Math.PI - 180;
      markers.push({ id: `rework-marker-${i}`, pos, angle, position });
    }
    return markers;
  }
}
