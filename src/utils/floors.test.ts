import { describe, expect, it } from 'vitest';
import { getLocalFloorModelUrl, resolveModelUrl } from './floors';

describe('floor model URL helpers', () => {
  it('maps basement floors to the shared zero-floor model', () => {
    expect(getLocalFloorModelUrl(-1)).toBe('/floors/0_floor.glb');
    expect(resolveModelUrl(-1, null)).toBe('/floors/0_floor.glb');
  });

  it('returns a local model when no asset URL is configured', () => {
    expect(resolveModelUrl(2, null)).toBe('/floors/2_floor.glb');
  });

  it('prefers an explicitly configured absolute asset URL', () => {
    expect(resolveModelUrl(2, 'https://cdn.example.test/floor.glb')).toBe(
      'https://cdn.example.test/floor.glb',
    );
  });

  it('rejects non-integer floor numbers', () => {
    expect(getLocalFloorModelUrl(1.5)).toBeNull();
  });
});
