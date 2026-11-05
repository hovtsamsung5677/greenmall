import { publicApiGet } from './client';
import type { ApiFloor, ApiFloorScene } from './types';

export function fetchFloors(signal?: AbortSignal): Promise<ApiFloor[]> {
  return publicApiGet<ApiFloor[]>('/public/floors', signal);
}

export function fetchFloorScene(floorId: string, signal?: AbortSignal): Promise<ApiFloorScene> {
  return publicApiGet<ApiFloorScene>(
    `/public/floors/${encodeURIComponent(floorId)}/scene`,
    signal,
  );
}
