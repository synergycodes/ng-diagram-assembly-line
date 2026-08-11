// Layout grid pitch in px. Nodes and edges snap to this so they line up — also
// the unit most other geometry constants are derived from.
export const GRID = 8;

// Coordinate equality slack in px. Two points within this count as coincident —
// absorbs sub-pixel float drift from rotation/snap math without merging distinct points.
export const POSITION_TOLERANCE_PX = 1;

// --- Rework loop-back detour geometry ---------------------------------------
// Back `reworkDetourPoints`, the detour shape `ReworkRouting` computes on screen
// (and writes into the model, so the DXF exporter reads the same points).

// Horizontal step out from the port before the detour turns down/up — 2.5 grid cells
// clear the port and its hit area.
export const REWORK_PORT_STANDOFF = GRID * 2.5; // 20

// Vertical gap the loop-back keeps below the lowest machine it passes under.
export const REWORK_NODE_CLEARANCE = GRID * 2.5; // 20
