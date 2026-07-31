// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inlineEdgeStrokeStyles } from './inline-edge-stroke-styles';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildCanvas(): {
  canvas: HTMLElement;
  edgePath: SVGPathElement;
  strayPath: SVGPathElement;
} {
  const canvas = document.createElement('div');

  const edge = document.createElement('ng-diagram-base-edge');
  const edgeSvg = document.createElementNS(SVG_NS, 'svg');
  const edgePath = document.createElementNS(SVG_NS, 'path');
  edgeSvg.appendChild(edgePath);
  edge.appendChild(edgeSvg);

  const straySvg = document.createElementNS(SVG_NS, 'svg');
  const strayPath = document.createElementNS(SVG_NS, 'path');
  straySvg.appendChild(strayPath);

  canvas.append(edge, straySvg);
  return { canvas, edgePath, strayPath };
}

function mockComputed(values: Record<string, string>): void {
  vi.stubGlobal(
    'getComputedStyle',
    () => ({ getPropertyValue: (prop: string) => values[prop] ?? '' }) as CSSStyleDeclaration,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('inlineEdgeStrokeStyles', () => {
  it('pins the computed stroke properties as inline styles on edge paths', () => {
    const { canvas, edgePath } = buildCanvas();
    mockComputed({
      stroke: 'rgb(255, 0, 0)',
      'stroke-width': '2px',
      'stroke-dasharray': '6px 8px',
      'stroke-linecap': 'round',
    });

    inlineEdgeStrokeStyles(canvas);

    expect(edgePath.style.getPropertyValue('stroke')).toBe('rgb(255, 0, 0)');
    expect(edgePath.style.getPropertyValue('stroke-width')).toBe('2px');
    expect(edgePath.style.getPropertyValue('stroke-dasharray')).toBe('6px 8px');
    expect(edgePath.style.getPropertyValue('stroke-linecap')).toBe('round');
  });

  it('skips properties whose computed value is empty or "none"', () => {
    const { canvas, edgePath } = buildCanvas();
    mockComputed({
      stroke: 'rgb(0, 0, 255)',
      'stroke-width': '',
      'stroke-dasharray': 'none',
      'stroke-linecap': 'butt',
    });

    inlineEdgeStrokeStyles(canvas);

    expect(edgePath.style.getPropertyValue('stroke')).toBe('rgb(0, 0, 255)');
    expect(edgePath.style.getPropertyValue('stroke-width')).toBe('');
    expect(edgePath.style.getPropertyValue('stroke-dasharray')).toBe('');
    expect(edgePath.style.getPropertyValue('stroke-linecap')).toBe('butt');
  });

  it('only targets paths inside ng-diagram-base-edge', () => {
    const { canvas, strayPath } = buildCanvas();
    mockComputed({ stroke: 'rgb(255, 0, 0)' });

    inlineEdgeStrokeStyles(canvas);

    expect(strayPath.hasAttribute('style')).toBe(false);
  });

  it('restore() reverts paths that had no style attribute', () => {
    const { canvas, edgePath } = buildCanvas();
    mockComputed({ stroke: 'rgb(255, 0, 0)', 'stroke-width': '2px' });

    const restore = inlineEdgeStrokeStyles(canvas);
    expect(edgePath.hasAttribute('style')).toBe(true);

    restore();
    expect(edgePath.hasAttribute('style')).toBe(false);
  });

  it('restore() reverts paths to their original style attribute', () => {
    const { canvas, edgePath } = buildCanvas();
    edgePath.setAttribute('style', 'opacity: 0.5');
    mockComputed({ stroke: 'rgb(255, 0, 0)' });

    const restore = inlineEdgeStrokeStyles(canvas);
    expect(edgePath.getAttribute('style')).toContain('stroke');

    restore();
    expect(edgePath.getAttribute('style')).toBe('opacity: 0.5');
  });
});
