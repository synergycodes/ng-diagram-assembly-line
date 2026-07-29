// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { pruneSvgStyles } from './prune-svg-styles';

const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

function stylesOf(svg: string, selector: string): Record<string, string> {
  const el = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector(selector);
  const decls: Record<string, string> = {};
  for (const part of (el?.getAttribute('style') ?? '').split(/;(?![^(]*\))/)) {
    const colon = part.indexOf(':');
    if (colon !== -1) {
      decls[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
    }
  }
  return decls;
}

describe('pruneSvgStyles', () => {
  it('keeps whitelisted properties and drops non-whitelisted ones', () => {
    const out = pruneSvgStyles(
      wrap('<rect data-id="a" style="color: red; anchor-name: none; animation: 1s; fill: blue"/>'),
    );
    expect(stylesOf(out, '[data-id="a"]')).toEqual({ color: 'red', fill: 'blue' });
  });

  it('drops whitelisted properties that hold their no-op default value', () => {
    const out = pruneSvgStyles(
      wrap('<g data-id="a" style="opacity: 1; margin: 0px; transform: none; display: flex"/>'),
    );
    expect(stylesOf(out, '[data-id="a"]')).toEqual({ display: 'flex' });
  });

  it('keeps whitelisted properties that hold a non-default value', () => {
    const out = pruneSvgStyles(
      wrap('<g data-id="a" style="opacity: 0.5; margin: 4px; transform: translate(2px, 3px)"/>'),
    );
    expect(stylesOf(out, '[data-id="a"]')).toEqual({
      opacity: '0.5',
      margin: '4px',
      transform: 'translate(2px, 3px)',
    });
  });

  it('does not split on semicolons inside parentheses (url/gradient values)', () => {
    const value = 'url("data:image/png;base64,AAAB")';
    const out = pruneSvgStyles(
      wrap(`<rect data-id="a" style='background-image: ${value}; anchor-name: none'/>`),
    );
    expect(stylesOf(out, '[data-id="a"]')).toEqual({ 'background-image': value });
  });

  it('matches property names case-insensitively', () => {
    const out = pruneSvgStyles(wrap('<rect data-id="a" style="COLOR: red"/>'));
    expect(stylesOf(out, '[data-id="a"]')).toEqual({ color: 'red' });
  });

  it('removes the style attribute entirely when nothing survives', () => {
    const out = pruneSvgStyles(wrap('<rect data-id="a" style="anchor-name: none; opacity: 1"/>'));
    const el = new DOMParser().parseFromString(out, 'image/svg+xml').querySelector('[data-id="a"]');
    expect(el?.hasAttribute('style')).toBe(false);
  });

  it('prunes each element independently and leaves other attributes intact', () => {
    const out = pruneSvgStyles(
      wrap(
        '<rect data-id="a" width="10" style="fill: red; anchor-name: none"/>' +
          '<rect data-id="b" style="stroke: blue; app-region: none"/>',
      ),
    );
    expect(stylesOf(out, '[data-id="a"]')).toEqual({ fill: 'red' });
    expect(stylesOf(out, '[data-id="b"]')).toEqual({ stroke: 'blue' });
    const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
    expect(doc.querySelector('[data-id="a"]')?.getAttribute('width')).toBe('10');
  });

  it('returns the input unchanged when it cannot be parsed as XML', () => {
    const malformed = '<svg><rect></svg>';
    expect(pruneSvgStyles(malformed)).toBe(malformed);
  });
});
