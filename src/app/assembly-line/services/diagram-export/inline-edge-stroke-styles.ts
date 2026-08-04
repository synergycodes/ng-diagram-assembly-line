const EDGE_STROKE_PROPS = ['stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap'];

/**
 * ng-diagram applies edge stroke/dash through CSS custom properties consumed
 * inside SVG presentation attributes (e.g.
 * `stroke-dasharray="var(--edge-stroke-dasharray, none)"`). `html-to-image` does
 * not carry those custom properties into its clone, so the `var()` falls back to
 * `none` and dashed edges export as solid lines.
 *
 * Snapshot the browser-resolved computed stroke values as concrete inline styles
 * (which `html-to-image` copies reliably) on every edge path inside `canvasEl`,
 * and return a function that restores the live DOM to its previous state — call
 * it once the capture is done.
 */
export function inlineEdgeStrokeStyles(canvasEl: HTMLElement): () => void {
  const paths = canvasEl.querySelectorAll<SVGPathElement>('ng-diagram-base-edge path');
  const restores: (() => void)[] = [];

  paths.forEach((path) => {
    const computed = getComputedStyle(path);
    const previousStyle = path.getAttribute('style');
    for (const prop of EDGE_STROKE_PROPS) {
      const value = computed.getPropertyValue(prop).trim();
      if (value && value !== 'none') {
        path.style.setProperty(prop, value);
      }
    }
    restores.push(() => {
      if (previousStyle === null) {
        path.removeAttribute('style');
      } else {
        path.setAttribute('style', previousStyle);
      }
    });
  });

  return () => restores.forEach((restore) => restore());
}
