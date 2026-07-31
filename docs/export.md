# Export (PNG, SVG, DXF)

The **Export** menu in the top navbar offers three formats — **PNG**, **SVG**,
and **DXF** — all generated entirely client-side, with no server round-trip. The
menu is disabled until the diagram has at least one node. Everything is wired
through a single page-scoped `DiagramExportService`
(`exportPng()` / `exportSvg()` / `exportDxf()`), which shares a DI scope with
`NgDiagramModelService` and captures the diagram host element on init.

Everything lives under `src/app/assembly-flow/services/diagram-export/`:

```
diagram-export/
├── diagram-export.service.ts     — exportPng() / exportSvg() / exportDxf()
├── inline-edge-stroke-styles.ts  — snapshot edge stroke/dash for capture (PNG/SVG)
├── prune-svg-styles.ts           — shrink html-to-image's inlined styles (SVG)
├── export-style-props.ts         — the keep/no-op style tables prune uses
├── dxf/                          — generic, domain-free DXF library (vendored)
│   ├── dxf-entity.ts             — DxfLwPolyline, DxfText (+ text sanitizer)
│   ├── dxf-document.ts           — layers, text styles, entities, header vars
│   ├── dxf-layer.ts, dxf-text-style.ts
│   ├── dxf-coordinate-mapper.ts  — diagram px → DXF mm, with the Y-axis flip
│   ├── dxf-types.ts              — renderer signatures + DxfExportConfig
│   ├── dxf-exporter.ts           — dispatches nodes/edges to renderers by type
│   ├── dxf-writer.ts             — DXF ASCII serializer (AutoCAD 2013 / AC1027)
│   └── dxf-writer.spec.ts        — tag-level AutoCAD-skeleton regression tests
└── dxf-assembly-flow/            — assembly-flow-specific renderers
    ├── assembly-dxf-constants.ts — layers, lineweights, scale, fonts, paddings
    ├── assembly-dxf-config.ts    — buildAssemblyFlowDxfConfig() — wires it up
    ├── dxf-draw-helpers.ts       — strokeRect / strokeLine / strokePolyline / addText
    ├── area-node-renderer.ts     — the `area` group container
    ├── station-node-renderer.ts  — the six station cards (shared)
    ├── edge-geometry.ts          — resolves each edge's rendered polyline
    ├── flow-edge-renderer.ts     — forward-flow + rework edges
    └── assembly-dxf-export.spec.ts
```

## PNG and SVG

Both are **snapshots of the live DOM** — pixel-faithful to what's on screen
(sparklines, node icons, gradients, the active theme's colors) — produced with
[`html-to-image`](https://www.npmjs.com/package/html-to-image) from the
`ng-diagram-canvas` element. This is the counterpart to DXF, which redraws the
diagram as a schematic vector (see below) rather than capturing it.

- **Region**: `computePartsBounds(nodes, edges)` plus a 50-unit padding defines
  the crop; the canvas is offset into that box via a `transform: translate(...)`.
- **Background**: transparent canvases would export black, so the background is
  resolved by walking up from the canvas to the first ancestor with a
  non-transparent computed background (theme-aware), falling back to white.
- **PNG** rasterizes at a 2× pixel ratio for crisp output (`toCanvas` →
  `image/png`). **SVG** stays vector (`toSvg`).
- **Edge strokes**: ng-diagram drives edge stroke/dash through CSS custom
  properties that `html-to-image` doesn't carry into its clone (so dashed edges
  would export solid). `inlineEdgeStrokeStyles` snapshots the browser-resolved
  stroke values as concrete inline styles before the capture and restores the
  DOM afterward.
- **SVG size**: `html-to-image` inlines the full computed style (~490
  declarations) on every element — typically ~85% of the file. `pruneSvgStyles`
  strips each element's inline style down to the visually-relevant properties
  (`export-style-props.ts`), cutting the file several times smaller with no
  visible change.

## DXF

DXF is a clean, vector, layer-aware drawing for CAD tools (AutoCAD & friends),
generated with no library dependency. The code is split so the architecture
stays clear: the `dxf/` folder knows nothing about assembly-flow — it is a
vendored copy of the DXF library from
[`ng-diagram-av-schematic`](https://github.com/synergycodes/ng-diagram-av-schematic)
and could be lifted into a standalone package as-is. All app specifics live in
`dxf-assembly-flow/`.

### What gets drawn

Geometry is read from the **measured** model (`node.size` / `node.position` /
`edge.points`), so the DXF lines up with what ng-diagram actually rendered.

- **Layers** (toggle-friendly): `AREAS` (group containers), `NODES` (station
  cards), `FLOW` (forward edges), `REWORK` (loop-back edges). Color is by layer
  (rework is amber); visual hierarchy is carried by lineweight (group 370).
- **Station cards** (`buffer`, `servo-press`, `welding-cell`,
  `quality-control`, `paint-shop`, `auto-assembly`) render as a schematic card:
  measured frame, a header (name + short id), a body, and a status footer. The
  body is the buffer's capacity bar or a KPI grid built from the type's
  [`property-meta`](../src/app/assembly-flow/model/property-meta.ts). On the
  types that show them on screen (servo-press, welding-cell, quality-control),
  each chartable KPI also gets its **sparkline** — the metric's history series
  (from `HistoryService`) traced as a polyline, reproducing the on-screen
  normalization. The bespoke paint-shop / auto-assembly dashboards are
  represented by their KPIs rather than reproduced pixel-for-pixel — DXF is a
  CAD schematic, not the screenshot that PNG/SVG already provide.
- **Areas** render as their outline plus an uppercased name tab.
- **Edges**: forward flow follows ng-diagram's orthogonal route. Rework
  loop-backs are re-derived to the same rectangular detour the
  `FlowEdgeComponent` draws on screen (the model's `edge.points` still holds the
  stale straight-through route), and get direction chevrons along the path.
- **Scale**: a fixed `0.3 mm` per diagram unit (not paper-fitted), so a
  station's physical size in the DXF stays constant regardless of diagram size.

Sparkline history only accumulates while the diagram is in **monitor mode** (the
live feed feeds `HistoryService`); exporting in edit mode yields cards without
sparklines, exactly as the on-screen cards then show placeholders.

### AutoCAD compatibility

AutoCAD parses DXF strictly by the declared `$ACADVER` and rejects R2000+ files
missing any mandatory structure ("Invalid or incomplete DXF input — drawing
discarded"), while online viewers and `ezdxf` are lenient. `dxf-writer.ts`
therefore emits the full R2000+ skeleton (VPORT / LTYPE / LAYER / STYLE / VIEW /
UCS / APPID / DIMSTYLE / BLOCK_RECORD tables, model/paper-space blocks, the
named-object dictionary tree with `Model` + `Layout1` layouts, and
`$HANDSEED`). Any appid referenced by XDATA (group 1001 — the text styles use
`ACAD` for TrueType font data) is registered in the APPID table. TEXT is
sanitized so a stray `%` can't trigger `%%`-format codes and control characters
can't break the group-code framing. `dxf-writer.spec.ts` locks all of this down
at the tag level.

### Adding or specializing a renderer

1. Write a `DxfNodeRenderer` / `DxfEdgeRenderer` (see `dxf/dxf-types.ts`). Use
   `ctx.mapper.mapPoint` / `mapLength` for coordinates and `ctx.doc.addEntity`
   to emit `DxfLwPolyline` / `DxfText` (or the `dxf-draw-helpers`).
2. Register it in `assembly-dxf-config.ts` under the matching `node.type` /
   `edge.type` key. Every type is registered explicitly; unregistered types are
   skipped with a `console.warn`. Nothing in `dxf/` needs to change.
