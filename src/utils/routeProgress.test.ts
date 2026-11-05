import { describe, expect, it } from 'vitest';
import { getNextRouteFloor, getRouteSegment } from './routeProgress';

describe('route progress', () => {
  const route = {
    segments: [
      { floorNumber: 2, id: 'store-to-lift-1' },
      { floorNumber: 1, id: 'lift-1-to-lift-2' },
      { floorNumber: 2, id: 'lift-2-to-store' },
    ],
  };

  it('keeps repeated visits to one floor as separate segments', () => {
    expect(getRouteSegment(route, 0)?.id).toBe('store-to-lift-1');
    expect(getRouteSegment(route, 2)?.id).toBe('lift-2-to-store');
  });

  it('advances through a 2 → 1 → 2 route in order', () => {
    expect(getNextRouteFloor(route, 0)).toBe(1);
    expect(getNextRouteFloor(route, 1)).toBe(2);
    expect(getNextRouteFloor(route, 2)).toBeNull();
  });
});
