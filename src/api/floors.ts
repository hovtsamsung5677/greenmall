import { apiGet } from './client';
import type { ApiFloor, ApiFloorScene } from './types';

export function fetchFloors(): Promise<ApiFloor[]> {
  return apiGet<ApiFloor[]>('/public/floors');
}

export function fetchFloorScene(floorId: string): Promise<ApiFloorScene> {
  return apiGet<ApiFloorScene>(`/public/floors/${encodeURIComponent(floorId)}/scene`);
}
