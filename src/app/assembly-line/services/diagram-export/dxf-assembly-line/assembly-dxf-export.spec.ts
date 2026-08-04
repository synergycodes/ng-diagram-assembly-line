import type { Edge, Node, Point } from 'ng-diagram';
import { describe, expect, it } from 'vitest';
import seed from '../../../state/initial-diagram.json';
import { reworkDetourPoints } from '../../../diagram/core/edges/rework-detour';
import { DxfLwPolyline } from '../dxf/dxf-entity';
import { DxfExporter } from '../dxf/dxf-exporter';
import { DxfWriter } from '../dxf/dxf-writer';
import { LAYERS } from './assembly-dxf-constants';
import { buildAssemblyLineDxfConfig } from './assembly-dxf-config';
import { isReworkEdge, resolveEdgePoints } from './edge-geometry';

/** No-history series reader: exercises the pipeline without sparklines. */
const noSeries = () => [];

/**
 * End-to-end smoke test: drives the full export pipeline (config → renderers →
 * writer) over the seed diagram, which contains every node type plus forward
 * and rework edges. Locks down that the renderers place entities on the right
 * layers and that the output is a well-formed, EOF-terminated R2000+ file.
 * Tag-level AutoCAD-skeleton guarantees live in `dxf/dxf-writer.spec.ts`.
 */
const nodes = seed.nodes as unknown as Node[];
const edges = seed.edges as unknown as Edge[];

const bounds = (() => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const size = node.size ?? { width: 0, height: 0 };
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
})();

/**
 * The exporter reads each edge's route from `edge.points` (ng-diagram's routing
 * writes it into the model at runtime — see `resolveEdgePoints`). The seed holds
 * no points, so stand in for a routed model: forward edges get a straight run
 * between endpoint centres, rework edges the same detour `ReworkRouting` computes.
 */
const centre = (id: string): Point => {
  const node = nodes.find((n) => n.id === id)!;
  const size = node.size ?? { width: 0, height: 0 };
  return { x: node.position.x + size.width / 2, y: node.position.y + size.height / 2 };
};
const bottom = (id: string): number => {
  const node = nodes.find((n) => n.id === id)!;
  return node.position.y + (node.size?.height ?? 0);
};
const routedEdges = edges.map((edge) => {
  const source = centre(edge.source);
  const target = centre(edge.target);
  const points = isReworkEdge(edge)
    ? reworkDetourPoints(source, target, [bottom(edge.source), bottom(edge.target)])
    : [source, target];
  return { ...edge, points } as Edge;
});

const resolvedEdges = routedEdges.map((edge) => ({
  ...edge,
  points: resolveEdgePoints(edge, nodes),
}));
const doc = new DxfExporter(buildAssemblyLineDxfConfig(noSeries)).export(
  nodes,
  resolvedEdges,
  bounds,
);
const entities = doc.getEntities();
const onLayer = (layer: string) => entities.filter((entity) => entity.layerName === layer);

describe('assembly-line DXF export', () => {
  it('serializes a well-formed R2000+ file', () => {
    const content = new DxfWriter().serialize(doc);
    expect(content).toContain('AC1027');
    expect(content.trimEnd().endsWith('EOF')).toBe(true);
  });

  it('draws each area container on the AREAS layer', () => {
    const areaCount = nodes.filter((node) => node.type === 'area').length;
    // One outline polyline + one name label per area.
    expect(onLayer(LAYERS.AREAS).length).toBe(areaCount * 2);
  });

  it('draws station cards on the NODES layer and nothing on empty layers unused', () => {
    const stationCount = nodes.filter((node) => node.type !== 'area').length;
    // At least a frame + header separator + footer separator + name + code per station.
    expect(onLayer(LAYERS.NODES).length).toBeGreaterThanOrEqual(stationCount * 5);
  });

  it('splits forward flow and rework edges onto their own layers', () => {
    const reworkCount = edges.filter(isReworkEdge).length;
    const flowCount = edges.length - reworkCount;
    expect(reworkCount).toBeGreaterThan(0);
    // One polyline per forward edge.
    expect(onLayer(LAYERS.FLOW).length).toBe(flowCount);
    // One polyline per rework edge plus at least one direction chevron each.
    expect(onLayer(LAYERS.REWORK).length).toBeGreaterThan(reworkCount);
  });

  it('draws a sparkline trace per chartable KPI when history is available', () => {
    const servo = nodes.find((node) => node.type === 'servo-press');
    expect(servo, 'seed has a servo-press node').toBeDefined();
    const size = servo!.size ?? { width: 240, height: 200 };
    const singleBounds = {
      x: servo!.position.x,
      y: servo!.position.y,
      width: size.width,
      height: size.height,
    };

    const nodePolylines = (readSeries: (nodeId: string, key: string) => number[]) => {
      const config = buildAssemblyLineDxfConfig(readSeries);
      const built = new DxfExporter(config).export([servo!], [], singleBounds);
      return built
        .getEntities()
        .filter((entity) => entity instanceof DxfLwPolyline && entity.layerName === LAYERS.NODES)
        .length;
    };

    // With history, each chartable KPI adds one more polyline (its trace).
    expect(nodePolylines(() => [10, 20, 15, 30, 25])).toBeGreaterThan(nodePolylines(noSeries));
  });
});
