import { clonePoint, clonePoints, isOrthogonalPolyline, near, sameX, sameY } from './point';

describe('clonePoint / clonePoints', () => {
  it('copies coords into a fresh object', () => {
    const p = { x: 1, y: 2 };
    const c = clonePoint(p);
    expect(c).toEqual(p);
    expect(c).not.toBe(p);
  });

  it('clones every point independently', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ];
    const clone = clonePoints(pts);
    clone[0].x = 99;
    expect(pts[0].x).toBe(0);
  });
});

describe('near / sameX / sameY', () => {
  it('treats sub-pixel drift (< 1px) as equal', () => {
    expect(near(10, 10.4)).toBe(true);
    expect(near(10, 11)).toBe(false);
    expect(sameX({ x: 4, y: 0 }, { x: 4.2, y: 100 })).toBe(true);
    expect(sameY({ x: 0, y: 7 }, { x: 100, y: 7.3 })).toBe(true);
    expect(sameX({ x: 4, y: 0 }, { x: 6, y: 0 })).toBe(false);
  });
});

describe('isOrthogonalPolyline', () => {
  it('accepts an axis-aligned polyline and rejects a diagonal segment', () => {
    const ortho = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
    ];
    expect(isOrthogonalPolyline(ortho)).toBe(true);

    const diagonal = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(isOrthogonalPolyline(diagonal)).toBe(false);
  });
});
