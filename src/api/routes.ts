import { apiGet } from './client';
import type { ApiRouteResponse, ApiRouteToStoreResponse } from './types';

export interface BuildRouteQuery {
  fromNodeId: string;
  toNodeId: string;
  floorId?: string;
}

export interface BuildRouteToStoreQuery {
  fromNodeId: string;
  storeId?: string;
  storeSlug?: string;
  storeCode?: string;
  floorId?: string;
}

export function buildRoute(query: BuildRouteQuery): Promise<ApiRouteResponse> {
  const params = new URLSearchParams();
  params.set('fromNodeId', query.fromNodeId);
  params.set('toNodeId', query.toNodeId);
  if (query.floorId) params.set('floorId', query.floorId);
  return apiGet<ApiRouteResponse>(`/public/routes/build?${params.toString()}`);
}

export function buildRouteToStore(
  query: BuildRouteToStoreQuery,
): Promise<ApiRouteToStoreResponse> {
  const params = new URLSearchParams();
  params.set('fromNodeId', query.fromNodeId);
  if (query.storeId) params.set('storeId', query.storeId);
  if (query.storeSlug) params.set('storeSlug', query.storeSlug);
  if (query.storeCode) params.set('storeCode', query.storeCode);
  if (query.floorId) params.set('floorId', query.floorId);
  return apiGet<ApiRouteToStoreResponse>(
    `/public/routes/to-store?${params.toString()}`,
  );
}
