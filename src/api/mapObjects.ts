import { apiGet, apiPost, apiPatch } from './client';
import type { ApiMapObject, ApiMapObjectType } from './types';

export interface MapObjectUpsertInput {
  type: ApiMapObjectType;
  name: string;
  floorId: string;
  storeId: string | null;
  x: number;
  y: number;
  z: number;
}

export type MapObjectUpdateInput = Partial<MapObjectUpsertInput>;

export function fetchMapObjects(floorId: string, limit = 200): Promise<ApiMapObject[]> {
  const params = new URLSearchParams();
  params.set('floorId', encodeURIComponent(floorId));
  params.set('limit', String(limit));
  return apiGet<ApiMapObject[]>(`/public/map-objects?${params.toString()}`);
}

export function fetchAllMapObjects(): Promise<ApiMapObject[]> {
  return apiGet<ApiMapObject[]>('/public/map-objects?limit=200');
}

export function createMapObject(
  input: MapObjectUpsertInput,
): Promise<ApiMapObject> {
  return apiPost<ApiMapObject>('/public/map-objects', input, false);
}

export function updateMapObject(
  id: string,
  input: Partial<MapObjectUpsertInput>,
): Promise<ApiMapObject> {
  return apiPatch<ApiMapObject>(`/public/map-objects/${id}`, input, false);
}
