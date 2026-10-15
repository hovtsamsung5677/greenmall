import { apiGet } from './client';
import type { ApiRouteNode } from './types';

/**
 * Пожарные (эвакуационные) лестницы этажа — активные узлы типа STAIRS
 * с metadata.isEvacuation. По ним на 3D-модели этажа рисуются маркеры.
 */
export function fetchEvacuationStairs(floorId: string): Promise<ApiRouteNode[]> {
  return apiGet<ApiRouteNode[]>(
    `/public/floors/${encodeURIComponent(floorId)}/evacuation-stairs`,
  );
}
