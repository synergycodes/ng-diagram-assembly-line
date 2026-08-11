# edge-reshape

Lets you drag any orthogonal segment of a selected edge. In assembly-line this
is the interaction for reshaping the conveyor **flow edges** between production
modules (presses → buffers → welding → paint → QC → assembly) while arranging
the line in **edit mode**. Fully generic — it knows only orthogonal-edge
geometry and an endpoint vocabulary (`anchored` / `free` / `dangling`).

Domain behaviour can be plugged in rather than hard-coded: a consumer may provide
a `ReshapeExtension` via the `EDGE_RESHAPE_EXTENSION` token to classify endpoints
and react when a "free" (non-port-anchored) end moves. **The app does not provide
one today**, so every endpoint is treated as port-anchored and reshape behaves as
plain segment editing. The seam is kept so future domain behaviour — e.g.
conveyor lines that branch or merge at a shared point — can plug in without
touching this feature.

**Register:** mount `EdgeReshapeOverlayComponent` — done by
`diagram/canvas/diagram.component.ts`, which renders it only in edit mode. The
overlay has no providers of its own; provide an `EDGE_RESHAPE_EXTENSION` if/when
domain behaviour is needed.

**Depends on:** `core/` only. **Used by:** the diagram canvas.
