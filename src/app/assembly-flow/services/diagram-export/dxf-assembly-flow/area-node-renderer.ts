import type { AssemblyNodeData } from '../../../model';
import type { DxfNodeRenderer } from '../dxf/dxf-types';
import { addText, strokeRect } from './dxf-draw-helpers';
import {
  AREA_LABEL_X,
  FALLBACK_AREA_HEIGHT,
  FALLBACK_AREA_WIDTH,
  FONT_AREA_LABEL,
  LAYERS,
  LINE_WEIGHT,
  TEXT_STYLE,
} from './assembly-dxf-constants';

/**
 * Renders an `area` group node — the container that other stations sit inside.
 * Just its measured outline plus an uppercased name tab straddling the top-left
 * of the border, mirroring `area-node.component`'s `.label`. Areas have no
 * ports and no metrics.
 */
export const renderAreaNode: DxfNodeRenderer = (ctx, node) => {
  const data = node.data as AssemblyNodeData;
  const x = node.position.x;
  const y = node.position.y;
  const width = node.size?.width ?? FALLBACK_AREA_WIDTH;
  const height = node.size?.height ?? FALLBACK_AREA_HEIGHT;

  strokeRect(ctx, LAYERS.AREAS, x, y, width, height, LINE_WEIGHT.AREA_FRAME);

  if (data.name) {
    // valign 2 (middle) centres the tab on the top border, as the DOM label does.
    addText(
      ctx,
      LAYERS.AREAS,
      data.name.toUpperCase(),
      x + AREA_LABEL_X,
      y,
      FONT_AREA_LABEL,
      TEXT_STYLE.BOLD,
      0,
      2,
    );
  }
};
