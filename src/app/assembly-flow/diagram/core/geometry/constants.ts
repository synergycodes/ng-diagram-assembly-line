// Layout grid pitch in px. Nodes and edges snap to this so they line up — also
// the unit most other geometry constants are derived from.
export const GRID = 8;

// Coordinate equality slack in px. Two points within this count as coincident —
// absorbs sub-pixel float drift from rotation/snap math without merging distinct points.
export const POSITION_TOLERANCE_PX = 1;
