# Diagram subsystem

The interactive production-line editor built on **ng-diagram**, structured so
reusable behaviour (`features/`) is separated from the shared plumbing it stands
on (`core/`).

```
diagram/
  canvas/      thin host component — registers templates and routes ng-diagram
               events to features. Its wiring lives in siblings:
               diagram-config (per-mode NgDiagramConfig), read-only.middleware
               (monitor-mode edit guard), area-fit (grow Area to fit children),
               live-feed.service (apply the monitor data feed to the model).
  core/        shared infrastructure (NOT a feature):
    geometry/          pure math + domain types (node-types, constants,
                       port-position, edge-stretch)
    ng-diagram-bridge/ adapters over the ng-diagram API (pointer-drag)
    nodes/  edges/     node & edge render components (module, area, paint-shop,
                       auto-assembly, flow edge, …)
  features/    self-contained, copy-pasteable behaviours (see below)
```

## Features

Each folder under `features/` is a self-contained behaviour with a single public
entry point (`index.ts`). It depends only on `core/`.

| Feature         | What it does                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `edge-reshape/` | Drag any orthogonal segment of a selected edge (generic; exposes an optional `EDGE_RESHAPE_EXTENSION` for domain specialisation) |
| `edge-routing/` | Keep manual (reshaped) edges attached to their ports as nodes — and Area groups — move                                           |

## How a feature registers

The canvas (`canvas/diagram.component.ts`) is the only wiring point. A feature
exposes some of:

- **Overlay component(s)** → added to the canvas `imports[]` and template
  (e.g. `EdgeReshapeOverlayComponent`).
- **Event handlers** → the canvas calls them from its ng-diagram event handlers
  (e.g. `applyEdgeStretchOnSelectionMoved` on `selectionMoved`).

## Scope note

The diagram layer implements only the edge-editing this production line needs:
dragging and reshaping the orthogonal conveyor edges. General graph editing —
drawing arbitrary new links or dragging an edge end onto a different port — is
deliberately left out; it doesn't map onto the directed `flow`/`rework` conveyor
edges and Area group nodes this app uses. Edges use orthogonal routing; reshaping
an edge flips it to `routingMode: 'manual'`, after which `edge-routing` keeps it
attached on moves.

## Dependency direction

`features → core`; `core` never imports a feature. The graph is acyclic and
every feature is liftable on its own.
