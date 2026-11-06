import { describe, expect, it, vi } from 'vitest';
import type { ApiFloorScene, ApiStore } from '@api/types';
import { resolveStoreRouteEndpoints } from './storeRouteEndpoints';

function store(id: string, floorId: string): ApiStore {
  return { id, floorId } as ApiStore;
}

function scene(floorId: string, storeId: string, nodeId: string): ApiFloorScene {
  return {
    floor: { id: floorId },
    stores: [{ id: storeId, primaryRouteNodeId: nodeId }],
  } as ApiFloorScene;
}

describe('resolveStoreRouteEndpoints', () => {
  it('resolves stores located on different floors', async () => {
    const scenes = new Map([
      ['floor-1', scene('floor-1', 'store-a', 'node-a')],
      ['floor-2', scene('floor-2', 'store-b', 'node-b')],
    ]);
    const loadFloorScene = vi.fn(async (floorId: string) => scenes.get(floorId)!);

    await expect(
      resolveStoreRouteEndpoints(
        [store('store-a', 'floor-1'), store('store-b', 'floor-2')],
        'store-a',
        'store-b',
        loadFloorScene,
      ),
    ).resolves.toEqual({ fromNodeId: 'node-a', toNodeId: 'node-b' });
    expect(loadFloorScene).toHaveBeenCalledTimes(2);
  });

  it('loads a shared floor only once', async () => {
    const sharedScene = {
      ...scene('floor-1', 'store-a', 'node-a'),
      stores: [
        { id: 'store-a', primaryRouteNodeId: 'node-a' },
        { id: 'store-b', primaryRouteNodeId: 'node-b' },
      ],
    } as ApiFloorScene;
    const loadFloorScene = vi.fn(async () => sharedScene);

    await resolveStoreRouteEndpoints(
      [store('store-a', 'floor-1'), store('store-b', 'floor-1')],
      'store-a',
      'store-b',
      loadFloorScene,
    );

    expect(loadFloorScene).toHaveBeenCalledTimes(1);
  });

  it('uses the nested public floor when floorId is omitted', async () => {
    const sharedScene = {
      ...scene('floor-1', 'store-a', 'node-a'),
      stores: [
        { id: 'store-a', primaryRouteNodeId: 'node-a' },
        { id: 'store-b', primaryRouteNodeId: 'node-b' },
      ],
    } as ApiFloorScene;
    const loadFloorScene = vi.fn(async () => sharedScene);
    const nestedFloorStore = (id: string) =>
      ({ id, floorId: null, floor: { id: 'floor-1', number: 1, name: 'Первый этаж' } }) as ApiStore;

    await expect(
      resolveStoreRouteEndpoints(
        [nestedFloorStore('store-a'), nestedFloorStore('store-b')],
        'store-a',
        'store-b',
        loadFloorScene,
      ),
    ).resolves.toEqual({ fromNodeId: 'node-a', toNodeId: 'node-b' });
    expect(loadFloorScene).toHaveBeenCalledWith('floor-1');
  });

  it('returns null when a store has no floor', async () => {
    const loadFloorScene = vi.fn();
    await expect(
      resolveStoreRouteEndpoints(
        [store('store-a', 'floor-1'), { ...store('store-b', 'floor-2'), floorId: null }],
        'store-a',
        'store-b',
        loadFloorScene,
      ),
    ).resolves.toBeNull();
    expect(loadFloorScene).not.toHaveBeenCalled();
  });
});
