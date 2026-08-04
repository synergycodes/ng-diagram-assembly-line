# ng-diagram Assembly Line Template

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Live demo:** https://www.ngdiagram.dev/templates/assembly-flow/

Interactive production-line monitor for automotive assembly plants. A starter kit
for building your own domain-specific live monitoring dashboard. Lay out servo
presses, buffers, welding cells, paint booths, and QC stations, connect them with
directed conveyor and rework-loop flows, and configure every module through a
schema-driven properties panel — then switch to Monitor mode to watch the line run
live, with real-time status, threshold-colored KPIs, and sparklines.

Built with Angular 21 and [ng-diagram](https://www.npmjs.com/package/ng-diagram);
the only runtime dependencies are Angular, ng-diagram,
[@ngx-formly/core](https://formly.dev/) (properties panel), and RxJS (the data
bus) — no opinionated third-party UI libraries, and no backend (Monitor mode is
driven by an in-browser mock data feed). Fork it as a starting point for factory
dashboards, process/flow editors, live SCADA-style monitors, or any node-and-link
diagram tool.

## Features

- **Drag-and-drop palette** of production modules onto a free-form canvas.
- **Two modes** — **Edit** (author the line) and **Monitor** (a read-only
  live view). The whole diagram locks down structurally in Monitor mode
  while data streams in.
- **Grid snapping** — node positions _and_ sizes snap to a 20px grid that matches
  the dotted background.
- **Flow & rework links** — animated "marching-ants" conveyor links whose speed
  reflects throughput; **rework loopbacks** auto-route a manual detour _around_
  the machines in between, with direction-following chevrons.
- **Orthogonal edge reshape** — drag any segment of a selected link; port-anchored
  ends grow L-bends so the endpoints stay put.
- **Edge routing** — links stretch to stay attached when their nodes move.
- **Area (group) nodes** — visual containers that group machines and move their
  members together.
- **Live node visuals** — status badges, animated machine "sprites", KPI grids,
  and **sparklines** that build up from the streaming data bus.
- **Alarm filter** — dim every node that isn't currently alarming.
- **Formly-driven properties panel** — edit warn/critical thresholds, colors,
  metric visibility, and node names.
- **Light / dark theming** via a design-token system, with no flash on load.

## Node Library

| Group          | Node                | Purpose                                                                      |
| -------------- | ------------------- | ---------------------------------------------------------------------------- |
| **Group**      | **Area**            | Visual container that groups machines; dragging it moves its members         |
| **Sources**    | **Servo Press**     | Stamping press — throughput, OEE, cycle time, pressure, temperature + charts |
| **Buffers**    | **Buffer**          | Inventory store — capacity fill bar                                          |
| **Processing** | **Welding Cell**    | Robotic welding — cycle time, active robots, welds completed                 |
| **Processing** | **Assembly**        | Final assembly — parts remaining, cycle time, current tasks                  |
| **Processing** | **Paint Shop**      | Paint booth — per-color tank levels, first-pass yield                        |
| **Quality**    | **Quality Control** | Inspection — pass rate, rejects, plus a **rework loopback** port             |

The catalog is data-driven and built on ng-diagram's own node types. Each kind and its
`data` payload interface (`*NodeData`) live in
[`model/node-data.ts`](src/app/assembly-line/model/node-data.ts) (`NODE_TYPES`, the
`NodeDataByKind` map); the typed node objects (`AssemblyNode` = `SimpleNode`/`GroupNode`
per kind) in [`model/nodes.ts`](src/app/assembly-line/model/nodes.ts); a single per-kind
registry — label, default `data` (`createDefault`), palette footprint — in
[`model/node-registry.ts`](src/app/assembly-line/model/node-registry.ts) (`NODE_REGISTRY`);
and the per-metric metadata (labels, units, thresholds) in
[`model/property-meta.ts`](src/app/assembly-line/model/property-meta.ts). A node's `type`
_is_ its kind, mapping it to a render component through the template map in
[`diagram/canvas/diagram.component.ts`](src/app/assembly-line/diagram/canvas/diagram.component.ts).

## Getting Started

**Prerequisites:** Node.js v20.19+ / v22.12+ and npm 10+.

```bash
npm install
npm start
# Open http://localhost:4200
```

## Scripts

| Script                 | Description                             |
| ---------------------- | --------------------------------------- |
| `npm start`            | Serve locally with HMR (`ng serve`)     |
| `npm run build`        | Production build (`ng build`)           |
| `npm run watch`        | Rebuild on change, development config   |
| `npm test`             | Run the unit suite once with **Vitest** |
| `npm run test:watch`   | Vitest in watch mode                    |
| `npm run lint`         | Lint with angular-eslint (`ng lint`)    |
| `npm run format`       | Format the repo with Prettier           |
| `npm run format:check` | Verify formatting without writing       |

## ng-diagram APIs Demonstrated

| Concern              | API                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------ |
| Bootstrap            | `provideNgDiagram()` (in the monitor page's providers)                               |
| Diagram surface      | `NgDiagramComponent`, `NgDiagramBackgroundComponent`                                 |
| Node templates       | `NgDiagramNodeTemplateMap`, `NgDiagramNodeSelectedDirective`                         |
| Edge templates       | `NgDiagramEdgeTemplateMap`, `NgDiagramBaseEdgeComponent`, `…BaseEdgeLabelComponent`  |
| Ports                | `NgDiagramPortComponent`                                                             |
| Palette              | `NgDiagramPaletteItemComponent`, `NgDiagramPaletteItemPreviewComponent`              |
| Model                | `NgDiagramModelService` (`updateNodeData`, `updateEdge`, `getNodeById`, `nodes`)     |
| Groups               | `NgDiagramGroupsService`, group membership events                                    |
| Selection & viewport | `NgDiagramSelectionService`, `NgDiagramViewportService`                              |
| Transactions         | `NgDiagramService.transaction()`                                                     |
| Config               | `NgDiagramConfig` — snapping, dotted background, edge routing, linking rules         |
| Middleware           | `createMiddlewares()` — a read-only guard for Monitor mode                           |
| Custom edge routing  | `NgDiagramService.registerRouting()` — a `ReworkRouting` for the loop-back detour    |
| Events               | `selectionChanged`, `selectionMoved`, `groupMembershipChanged`, `paletteItemDropped` |

## Architecture

```
src/
├─ main.ts, index.html, styles.scss     # bootstrap, pre-paint theme, design tokens
└─ app/
   ├─ app.config.ts, app.routes.ts      # providers, single lazy route
   └─ assembly-line/                    # domain root — feature-sliced ng-diagram layout
      ├─ pages/assembly-line/           # page shell: provideNgDiagram + Formly, top bar
      ├─ components/                    # chrome: palette, properties-panel (Formly), theme-toggle
      ├─ diagram/
      │  ├─ canvas/                     # ng-diagram host, template maps, config, central applier
      │  ├─ core/
      │  │  ├─ nodes/                   # assembly (generic) / area / paint-shop / auto-assembly + icon, sparkline
      │  │  ├─ edges/                   # flow edge (+ rework detour & chevrons)
      │  │  ├─ geometry/                # grid, orthogonal helpers, port/edge math
      │  │  └─ ng-diagram-bridge/       # pointer-drag controller
      │  └─ features/                   # self-contained plugins with their own barrels
      │     ├─ edge-reshape/            # drag segments; optional extension seam
      │     └─ edge-routing/            # keep links attached on node move
      ├─ model/                         # node-data types, typed node union, node registry, property metadata
      ├─ services/                      # history (sparklines), view-config, alarm filter, theme
      ├─ shared/                        # barrel for node/edge components + view services
      └─ state/                         # diagram store, mode/selection
         └─ mock-feed/                  # in-browser production engine + per-type generators
```

## Design Tokens

Theming runs on a three-tier `--al-*` (Assembly Line) custom-property system
defined in [`src/styles.scss`](src/styles.scss): primitive palette (`--al-color-*`)
→ semantic tokens (`--al-sem-color-bg/text/stroke-*`) → component usage. The `--al-*`
prefix marks app-owned tokens, keeping them distinct from ng-diagram's own `--ngd-*`
tokens (the library reads `--ngd-*`; a few app values are bridged into them, e.g.
`--ng-diagram-background-color` and the node `--ngd-port-*` vars). Light mode
overrides only the semantic tier under `:root[data-theme='light']`, and the
ng-diagram canvas background is bound to a semantic token so it flips with the
theme. `data-theme` is applied by a pre-paint inline script in `index.html`
(so there's no flash) and toggled at runtime by `ThemeService`. The dotted grid
(20px), flow-edge stroke/dash, and status colors are all token-driven.

## Customization

- **Add a node type** — add the kind to `NODE_TYPES`, a `*NodeData` interface, and a
  `NodeDataByKind` entry in [`model/node-data.ts`](src/app/assembly-line/model/node-data.ts);
  a matching node alias (and `AssemblyNode` union member) in
  [`model/nodes.ts`](src/app/assembly-line/model/nodes.ts); a `NODE_REGISTRY` entry (label,
  `createDefault`) in [`model/node-registry.ts`](src/app/assembly-line/model/node-registry.ts);
  its metrics in [`model/property-meta.ts`](src/app/assembly-line/model/property-meta.ts);
  a render component in the template map in
  [`diagram/canvas/diagram.component.ts`](src/app/assembly-line/diagram/canvas/diagram.component.ts);
  and (for live values) a generator under
  [`state/mock-feed/generators/`](src/app/assembly-line/state/mock-feed/generators/).
- **Change the seed diagram** — edit
  [`state/initial-diagram.json`](src/app/assembly-line/state/initial-diagram.json); the app
  seeds fresh from it on every load.
- **Tune the canvas** — grid pitch, snapping, background spacing, edge routing, and
  the read-only Monitor guard all live in the `config`/`middlewares` of
  [`diagram/canvas/diagram.component.ts`](src/app/assembly-line/diagram/canvas/diagram.component.ts).

## Live Data Feed

There is no server — Monitor mode is powered entirely in the browser:

- [`state/mock-feed/mock-production-engine.ts`](src/app/assembly-line/state/mock-feed/mock-production-engine.ts)
  seeds a scoped state and, on a set of timers, random-walks each **working**
  node's metrics and periodically re-rolls statuses (weighted
  working / idle / error).
- [`state/data-connection.service.ts`](src/app/assembly-line/state/data-connection.service.ts)
  exposes an RxJS **data bus** — `updatesFor(nodeIds)` — that starts generation on
  subscribe and emits self-describing `DataUpdate` messages.
- [`diagram/canvas/diagram.component.ts`](src/app/assembly-line/diagram/canvas/diagram.component.ts)
  is the single **central applier**: it subscribes in Monitor mode and writes
  each update into the ng-diagram model plus the sparkline history; switching to
  Edit tears the subscription down.

## Notes & Limitations

- **No backend** — all data is a client-side mock, so values are synthetic
  (weighted-random), not a real production line.
- **Sparkline history is ephemeral** — kept in memory only, so charts start empty
  and rebuild each session/reload.
- **Interactive mode is read-only** — structural edits (move, link, resize,
  delete) are blocked while monitoring; only live data mutates nodes.
- **Rework links use a manual detour** — ng-diagram has no obstacle-avoiding
  router, so the loopback path is computed from live node bounds.
- Unit tests (Vitest) cover the pure geometry/routing logic; there is no e2e suite.

## Tech Stack

- [Angular 21](https://angular.dev/) — standalone components, signals, `OnPush`
- [ng-diagram](https://www.npmjs.com/package/ng-diagram) — the diagram engine
- [@ngx-formly/core](https://formly.dev/) — the schema-driven properties panel
- [RxJS](https://rxjs.dev/) — the data bus
- [Vitest](https://vitest.dev/) (via the built-in `@angular/build:unit-test` builder) — unit tests
- Plain SCSS with a `--ngd-*` design-token system (light/dark)
- [Phosphor Icons](https://phosphoricons.com/), Poppins + JetBrains Mono fonts

## Contributing

1. `npm install`
2. Develop against the dev server (`npm start`).
3. Before opening a PR, make sure `npm run lint`, `npm run format:check`, and
   `npm test` all pass, and that `npm run build` succeeds.

## License

MIT — see [LICENSE](LICENSE).
