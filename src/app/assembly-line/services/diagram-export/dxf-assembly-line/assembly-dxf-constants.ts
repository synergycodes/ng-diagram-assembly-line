/**
 * assembly-line-specific DXF constants: layers, colors, lineweights, the
 * px→mm scale, and the font sizes / paddings the renderers use to lay out a
 * node card's interior. Tunable here without touching the generic `dxf/`
 * library or the renderers.
 */

/**
 * DXF layers. Two node layers (station cards vs. area containers) and two edge
 * layers (forward flow vs. rework loop-backs) so a CAD user can toggle each
 * group independently, mirroring the on-screen structure.
 */
export const LAYERS = {
  AREAS: 'AREAS',
  NODES: 'NODES',
  FLOW: 'FLOW',
  REWORK: 'REWORK',
} as const;

/** AutoCAD Color Index values (color-by-layer; hierarchy carried by lineweight). */
export const ACI = {
  /** White on dark model space, black on white paper — the neutral default. */
  WHITE: 7,
  /** Dark grey — subtler than the node frames. */
  GREY: 8,
  /** Yellow ≈ the on-screen amber used for rework edges. */
  AMBER: 2,
} as const;

export const TEXT_STYLE = {
  STANDARD: 'STANDARD',
  BOLD: 'BOLD',
} as const;

/**
 * Lineweights in 1/100 mm (DXF group code 370). Values MUST come from the DXF
 * standard lineweight enum (0, 5, 9, 13, 15, 18, 20, 25, 30, 35, ...) —
 * AutoCAD rejects arbitrary weights.
 */
export const LINE_WEIGHT = {
  /** Station card outline — the most prominent frame. */
  NODE_FRAME: 35,
  /** Area (group) container outline. */
  AREA_FRAME: 25,
  /** Header/footer separators and KPI grid dividers. */
  DIVIDER: 13,
  /** Forward flow edges. */
  FLOW: 25,
  /** Rework loop-back edges + their direction chevrons. */
  REWORK: 25,
  /** Small interior detail (buffer/paint bars). */
  DETAIL: 18,
  /** KPI sparkline trace — the thinnest valid weight (mirrors the 1.25px stroke). */
  SPARK: 13,
} as const;

/** DXF millimetres per one diagram unit. Fixed (not paper-fitted), as in the reference. */
export const DXF_SCALE_MM_PER_PX = 0.3;

/** Padding around the drawing, in diagram units. */
export const DIAGRAM_PADDING = 50;

/** Approximates the browser default line-height for the project font (Poppins). */
export const TEXT_LINE_HEIGHT_RATIO = 1.4;

// --- Node card interior (diagram px, mirroring the component SCSS) ----------

/** `.head` band height: 10px padding + ~22px content + 10px padding + border. */
export const HEADER_HEIGHT = 44;
/** `.foot` band height: 6px padding + ~14px text + 7px padding + border. */
export const FOOTER_HEIGHT = 28;
/** Horizontal padding inside header/footer (`padding: … 12px`). */
export const CARD_PAD_X = 12;
/** `.buffer-body` / KPI cell padding. */
export const BODY_PAD_X = 12;
export const BODY_PAD_Y = 10;
export const KPI_PAD_X = 10;
export const KPI_PAD_Y = 8;
/** `.buffer-bar { height: 6px }`. */
export const BUFFER_BAR_HEIGHT = 6;
/** KPI grid switches to two columns above one metric (`data-cols`). */
export const KPI_TWO_COLUMN_THRESHOLD = 1;
/** `.spark { height: 12px; margin-top: 2px }` — the mini-chart under a KPI value. */
export const SPARK_HEIGHT = 12;
export const SPARK_MARGIN_TOP = 2;

export const FONT_NAME = 13;
export const FONT_CODE = 10;
export const FONT_KPI_LABEL = 9;
export const FONT_KPI_VALUE = 14;
export const FONT_FOOTER = 10;
export const FONT_BUFFER_LABEL = 9;
export const FONT_BUFFER_VALUE = 13;

// --- Area (group) container -------------------------------------------------

/** `.label { left: 16px }` — the name tab straddling the top border. */
export const AREA_LABEL_X = 16;
export const FONT_AREA_LABEL = 10;

// --- Rework edge routing (mirrors flow-edge.component.ts) --------------------
/** `MARKER_PIXEL_SPACING` — one direction chevron per this many px of path. */
export const REWORK_MARKER_SPACING = 300;
/** Direction-chevron footprint (diagram px). */
export const REWORK_CHEVRON_LENGTH = 14;
export const REWORK_CHEVRON_WIDTH = 10;

/** Fallback card sizes when a node has not been measured yet (unlikely at export time). */
export const FALLBACK_NODE_WIDTH = 240;
export const FALLBACK_NODE_HEIGHT = 140;
export const FALLBACK_AREA_WIDTH = 360;
export const FALLBACK_AREA_HEIGHT = 220;
