import { NgDiagramModelService } from 'ng-diagram';
import { NODE_TYPES, type AssemblyNodeData } from '../../model';

const AREA_PADDING = 16;
const AREA_PADDING_TOP = 28;

/**
 * Defensive fallback for the drop paths where we can't await measurements
 * (a direct drop into a group, whose mutation the library already made): retry
 * the fit across a few frames until the children report a measured size.
 */
export function fitAreaWhenReady(
  modelService: NgDiagramModelService,
  groupId: string,
  attempt = 0,
): void {
  if (fitAreaToChildren(modelService, groupId) || attempt > 10) {
    return;
  }
  requestAnimationFrame(() => fitAreaWhenReady(modelService, groupId, attempt + 1));
}

/**
 * Grow the Area to enclose its children (never shrinks). Returns `false` only
 * when a child has no measured size yet, so callers can retry; `true` once the
 * fit has been applied — or there was nothing to fit.
 */
export function fitAreaToChildren(modelService: NgDiagramModelService, groupId: string): boolean {
  const group = modelService.getNodeById<AssemblyNodeData>(groupId);
  if (group?.type !== NODE_TYPES.AREA || !group.size) {
    return true;
  }

  const children = modelService.getChildren(groupId);
  if (!children.length) {
    return true;
  }
  if (children.some((child) => child.size === undefined)) {
    return false;
  }

  // Union of the group's current rect with each child's padded rect. Seeding
  // from the group's own edges is what keeps the Area from ever shrinking.
  // (NB: `computePartsBounds` is unusable here — it unions with an origin
  // sentinel for the empty edge list, dragging a subset's bounds back to 0,0.)
  let left = group.position.x;
  let top = group.position.y;
  let right = left + group.size.width;
  let bottom = top + group.size.height;

  for (const child of children) {
    if (!child.size) {
      continue;
    }
    const cLeft = child.position.x - AREA_PADDING;
    const cTop = child.position.y - AREA_PADDING_TOP;
    const cRight = child.position.x + child.size.width + AREA_PADDING;
    const cBottom = child.position.y + child.size.height + AREA_PADDING;
    if (cLeft < left) {
      left = cLeft;
    }
    if (cTop < top) {
      top = cTop;
    }
    if (cRight > right) {
      right = cRight;
    }
    if (cBottom > bottom) {
      bottom = cBottom;
    }
  }

  const newWidth = right - left;
  const newHeight = bottom - top;
  if (
    left === group.position.x &&
    top === group.position.y &&
    newWidth === group.size.width &&
    newHeight === group.size.height
  ) {
    return true;
  }

  modelService.updateNode(groupId, {
    position: { x: left, y: top },
    size: { width: newWidth, height: newHeight },
    autoSize: false,
  });
  return true;
}
