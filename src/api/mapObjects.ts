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

/** Максимум, который принимает публичный эндпоинт (@Max(100)). */
const MAP_OBJECTS_MAX_LIMIT = 100;

/** Ограничивает limit сверху значением, допустимым бэкендом. */
function clampMapObjectsLimit(limit: number): number {
  if (!Number.isFinite(limit)) return MAP_OBJECTS_MAX_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAP_OBJECTS_MAX_LIMIT);
}

export function fetchMapObjects(
  floorId: string,
  limit = MAP_OBJECTS_MAX_LIMIT,
): Promise<ApiMapObject[]> {
  const params = new URLSearchParams();
  params.set('floorId', encodeURIComponent(floorId));
  params.set('limit', String(clampMapObjectsLimit(limit)));
  return apiGet<ApiMapObject[]>(`/public/map-objects?${params.toString()}`);
}

export function fetchAllMapObjects(): Promise<ApiMapObject[]> {
  return apiGet<ApiMapObject[]>(
    `/public/map-objects?limit=${MAP_OBJECTS_MAX_LIMIT}`,
  );
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
