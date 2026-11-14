import { describe, expect, it } from 'vitest';
import { STORE_LABELS_BY_FLOOR, UNRESOLVED_UPPER_FLOOR_LABELS } from './storeLabelPlacements';
import {
  FIRST_FLOOR_STORE_LABELS,
  UNRESOLVED_FIRST_FLOOR_LABELS,
  boxesOverlap,
  labelCenter,
  projectedClearance,
} from './firstFloorStoreLabels';

describe('first-floor visual labels', () => {
  it('keeps upper-floor placements unique, bounded and separate from unconfirmed kiosks', () => {
    const all = Object.values(STORE_LABELS_BY_FLOOR).flat();
    expect(new Set(all.map(p => p.slug)).size).toBe(all.length);
    expect(Object.keys(STORE_LABELS_BY_FLOOR)).toEqual(['1', '2', '3', '4']);
    for (const p of all) {
      const [l, t, r, b] = p.interior;
      expect(l).toBeGreaterThanOrEqual(0);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(900);
      expect(b).toBeLessThanOrEqual(600);
      expect(r).toBeGreaterThan(l);
      expect(b).toBeGreaterThan(t);
      expect(UNRESOLVED_UPPER_FLOOR_LABELS as readonly string[]).not.toContain(p.slug);
    }
  });
  it('has unique placements, no unresolved guesses, and interior centres', () => {
    expect(new Set(FIRST_FLOOR_STORE_LABELS.map((p) => p.slug)).size).toBe(
      FIRST_FLOOR_STORE_LABELS.length,
    );
    for (const placement of FIRST_FLOOR_STORE_LABELS) {
      expect(UNRESOLVED_FIRST_FLOOR_LABELS as readonly string[]).not.toContain(placement.slug);
      const { x, y } = labelCenter(placement);
      const [l, t, r, b] = placement.interior;
      expect(x).toBeGreaterThan(l);
      expect(x).toBeLessThan(r);
      expect(y).toBeGreaterThan(t);
      expect(y).toBeLessThan(b);
    }
  });
  it('keeps Dodo and POLARIS in separate rooms', () => {
    const polaris = FIRST_FLOOR_STORE_LABELS.find((p) => p.slug === 'polaris')!;
    const dodo = FIRST_FLOOR_STORE_LABELS.find((p) => p.slug === 'dodo-pizza')!;
    expect(dodo.interior[1]).toBeGreaterThan(polaris.interior[3]);
  });
  it('computes clearance for rotated and oblique projections', () => {
    expect(
      projectedClearance({ x: 0, y: 0 }, [
        { x: 0, y: -10 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: -10, y: 0 },
      ]),
    ).toBeCloseTo(Math.sqrt(50));
    expect(
      projectedClearance({ x: 5, y: 2 }, [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 9, y: 4 },
        { x: 1, y: 4 },
      ]),
    ).toBeCloseTo(2);
  });
  it('reserves a gap between adjacent labels but allows distant markers', () => {
    const a = { x: 0, y: 0, width: 30, height: 20 };
    expect(boxesOverlap(a, { ...a, x: 32 })).toBe(true);
    expect(boxesOverlap(a, { ...a, x: 35 })).toBe(false);
    expect(boxesOverlap(a, { ...a, y: 25 })).toBe(false);
  });
});
