import { KEEP_STYLE_PROPS, NOOP_STYLE_VALUES } from './export-style-props';

/**
 * Strips each element's inline style down to the visually-relevant properties
 * (see {@link KEEP_STYLE_PROPS}), dropping no-op defaults (see
 * {@link NOOP_STYLE_VALUES}). `html-to-image` inlines the full computed style
 * (~490 declarations) on every element, which typically accounts for ~85% of an
 * exported SVG's size; pruning cuts the file several times smaller with no
 * visible change. Returns the input unchanged if it fails to parse as XML.
 */
export function pruneSvgStyles(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return svg;
  }

  doc.querySelectorAll('[style]').forEach((el) => {
    const raw = el.getAttribute('style');
    if (!raw) {
      return;
    }
    const kept: string[] = [];
    // Split on ';' that is not inside parentheses (e.g. gradients, url()).
    for (const declaration of raw.split(/;(?![^(]*\))/)) {
      const colon = declaration.indexOf(':');
      if (colon === -1) {
        continue;
      }
      const prop = declaration.slice(0, colon).trim().toLowerCase();
      const value = declaration.slice(colon + 1).trim();
      if (!prop || !value || !KEEP_STYLE_PROPS.has(prop) || NOOP_STYLE_VALUES[prop] === value) {
        continue;
      }
      kept.push(`${prop}: ${value}`);
    }
    if (kept.length) {
      el.setAttribute('style', kept.join('; '));
    } else {
      el.removeAttribute('style');
    }
  });

  return new XMLSerializer().serializeToString(doc);
}
