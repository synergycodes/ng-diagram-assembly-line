import { NgDiagramModelService } from 'ng-diagram';
import { NODE_TYPES, type AssemblyNodeData } from '../../model';
import type { AssemblyLineConfig } from '../../assembly-line.config';

type AreaPadding = AssemblyLineConfig['area'];

/**
 * Defensive fallback for the drop paths where measurements can't be awaited
 * (a direct drop into a group, whose mutation the library already made): retry
 * the fit across a few frames until the children report a measured size.
 */
export function fitAreaWhenReady(
  modelService: NgDiagramModelService,
  groupId: string,
  area: AreaPadding,
  attempt = 0,
): void {
  if (fitAreaToChildren(modelService, groupId, area) || attempt > 10) {
    return;
  }
  requestAnimationFrame(() => fitAreaWhenReady(modelService, groupId, area, attempt + 1));
}

/**
 * Grow the Area to enclose its children (never shrinks). Returns `false` only
 * when a child has no measured size yet, so callers can retry; `true` once the
 * fit has been applied — or there was nothing to fit.
 */
export function fitAreaToChildren(
  modelService: NgDiagramModelService,
  groupId: string,
  area: AreaPadding,
): boolean {
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
  // The manual loop is a workaround: `computePartsBounds` currently includes
  // the origin when querying a subset of nodes; switch over once that is
  // fixed in ng-diagram.
  let left = group.position.x;
  let top = group.position.y;
  let right = left + group.size.width;
  let bottom = top + group.size.height;

  for (const child of children) {
    if (!child.size) {
      continue;
    }
    const cLeft = child.position.x - area.padding;
    const cTop = child.position.y - area.paddingTop;
    const cRight = child.position.x + child.size.width + area.padding;
    const cBottom = child.position.y + child.size.height + area.padding;
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
