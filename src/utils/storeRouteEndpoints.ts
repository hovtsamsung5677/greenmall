import type { ApiFloorScene, ApiStore } from '@api/types';

export interface StoreRouteEndpoints {
  fromNodeId: string;
  toNodeId: string;
}

export async function resolveStoreRouteEndpoints(
  stores: ApiStore[],
  fromStoreId: string,
  toStoreId: string,
  loadFloorScene: (floorId: string) => Promise<ApiFloorScene>,
): Promise<StoreRouteEndpoints | null> {
  const fromStore = stores.find((store) => store.id === fromStoreId);
  const toStore = stores.find((store) => store.id === toStoreId);
  if (!fromStore?.floorId || !toStore?.floorId) return null;

  const floorIds = [...new Set([fromStore.floorId, toStore.floorId])];
  const scenes = await Promise.all(floorIds.map(loadFloorScene));

  const findNodeId = (storeId: string): string | null => {
    for (const floorScene of scenes) {
      const store = floorScene.stores.find((item) => item.id === storeId);
      if (store?.primaryRouteNodeId) return store.primaryRouteNodeId;
    }
    return null;
  };

  const fromNodeId = findNodeId(fromStoreId);
  const toNodeId = findNodeId(toStoreId);
  return fromNodeId && toNodeId ? { fromNodeId, toNodeId } : null;
}
