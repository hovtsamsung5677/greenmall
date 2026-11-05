import { describe, expect, it } from 'vitest';
import { advanceRouteDistance } from './routeAnimation';

describe('advanceRouteDistance', () => {
  it('covers the same distance in the same time on routes of different lengths', () => {
    expect(advanceRouteDistance(0, 1, 1000, 120)).toBe(120);
    expect(advanceRouteDistance(0, 1, 300, 120)).toBe(120);
  });

  it('makes route duration proportional to its length', () => {
    const speed = 100;
    expect(advanceRouteDistance(0, 1, 100, speed)).toBe(100);
    expect(advanceRouteDistance(0, 1, 400, speed)).toBe(100);
  });

  it('stops exactly at the end of the route', () => {
    expect(advanceRouteDistance(90, 1, 100, 120)).toBe(100);
  });
});
