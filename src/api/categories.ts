import { publicApiGet } from './client';
import type { ApiCategory, ApiStore } from './types';

export function fetchCategories(signal?: AbortSignal): Promise<ApiCategory[]> {
  return publicApiGet<ApiCategory[]>('/public/categories', signal);
}

export function fetchStores(limit = 100, signal?: AbortSignal): Promise<ApiStore[]> {
  return publicApiGet<ApiStore[]>(`/public/stores?limit=${limit}`, signal).then((stores) =>
    stores
      .filter((store) => store.floor?.id)
      .map((store) => ({ ...store, floorId: store.floorId ?? store.floor!.id })),
  );
}
