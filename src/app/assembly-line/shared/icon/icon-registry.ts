/**
 * Central SVG icon library. Each entry is a single `<path>` `d` string drawn on a
 * shared `0 0 24 24` grid, rendered stroke-only (`fill="none"`,
 * `stroke="currentColor"`) so icons inherit the surrounding text color and theme
 * and scale to the `size` set on {@link IconComponent} (`<app-icon>`). Add an icon
 * here and reference it by key instead of pasting SVG into a template.
 *
 * Every glyph is folded into one path — closed shapes (circles, rounded rects)
 * become arc subpaths, multi-part glyphs become `M`-separated subpaths — so the
 * component can bind `d` directly with no inner-markup injection.
 *
 * `strokeWidth` is expressed in these 24-unit coordinates, so it scales with the
 * icon: the rendered thickness is `strokeWidth * size / 24` px.
 */
export interface IconDef {
  /** Stroke width in 24-unit grid coordinates (scales with `size`). */
  readonly strokeWidth: number;
  /** The `d` attribute of a single `<path>` on a `0 0 24 24` grid. */
  readonly path: string;
}

export const ICONS = {
  /** Light-theme toggle. */
  sun: {
    strokeWidth: 2,
    path: 'M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  },
  /** Dark-theme toggle. */
  moon: {
    strokeWidth: 2,
    path: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  },
  /** Export button (upload tray). */
  export: {
    strokeWidth: 2.25,
    path: 'M12 15V3M7.5 7.5l4.5-4.5 4.5 4.5M3.75 15v4.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-4.5',
  },
  /** Dropdown caret (points down; rotate via CSS for open state). */
  caret: {
    strokeWidth: 2.25,
    path: 'M6 9l6 6 6-6',
  },
  /** PNG export — framed picture. */
  image: {
    strokeWidth: 2.25,
    path: 'M5.25 4.5H18.75A2.25 2.25 0 0 1 21 6.75V17.25A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75A2.25 2.25 0 0 1 5.25 4.5ZM6.75 9.75a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0zM3.75 16.5l4.5-4.5 4.5 4.5 3-3 4.5 4.5',
  },
  /** SVG export — document with folded corner. */
  file: {
    strokeWidth: 2.25,
    path: 'M13.5 2.25H6a1.5 1.5 0 0 0-1.5 1.5v16.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8.25zM13.5 2.25v6h6',
  },
  /** DXF export — framed drawing. */
  'file-dxf': {
    strokeWidth: 2.25,
    path: 'M5.25 3.75H18.75A2.25 2.25 0 0 1 21 6V18A2.25 2.25 0 0 1 18.75 20.25H5.25A2.25 2.25 0 0 1 3 18V6A2.25 2.25 0 0 1 5.25 3.75ZM7.5 9h2.25a2.25 2.25 0 0 1 0 4.5H7.5zM7.5 9v4.5M14.25 9L16.5 14.25M16.5 9L14.25 14.25',
  },
  /** Alarm-category filter (sliders). */
  filter: {
    strokeWidth: 2.25,
    path: 'M3 6h18M6 12h12M9 18h6',
  },
  /** Section-collapse chevron (points down; rotate via CSS when collapsed). */
  chevron: {
    strokeWidth: 3.6,
    path: 'M4.8 8.4L12 15.6L19.2 8.4',
  },
  /** Rework-edge direction marker. */
  rework: {
    strokeWidth: 4,
    path: 'M14 7 9 12 14 17',
  },
  /** Edge-reshape drag handle (double arrow; rotate via CSS per axis). */
  reshape: {
    strokeWidth: 2,
    path: 'M8 8 12 4 16 8M8 16 12 20 16 16M12 4V20',
  },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
