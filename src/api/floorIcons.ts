import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { ApiFloorIcon } from './types';

export interface CreateFloorIconInput {
  name: string;
  floorId: string;
  assetId: string;
  x: number;
  y: number;
  z?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  storeId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateFloorIconInput = Partial<CreateFloorIconInput>;

export function fetchAdminFloorIcons(floorId?: string): Promise<ApiFloorIcon[]> {
  const params = new URLSearchParams();
  if (floorId) params.set('floorId', floorId);
  const query = params.toString();
  return apiGet<ApiFloorIcon[]>(`/admin/floor-icons${query ? `?${query}` : ''}`);
}

export function fetchPublicFloorIcons(floorId?: string): Promise<ApiFloorIcon[]> {
  const params = new URLSearchParams();
  if (floorId) params.set('floorId', floorId);
  const query = params.toString();
  return apiGet<ApiFloorIcon[]>(`/public/floor-icons${query ? `?${query}` : ''}`);
}

export function createFloorIcon(input: CreateFloorIconInput): Promise<ApiFloorIcon> {
  return apiPost<ApiFloorIcon>('/admin/floor-icons', input);
}

export function updateFloorIcon(
  id: string,
  input: UpdateFloorIconInput,
): Promise<ApiFloorIcon> {
  return apiPatch<ApiFloorIcon>(`/admin/floor-icons/${id}`, input);
}

export function deleteFloorIcon(id: string): Promise<ApiFloorIcon> {
  return apiDelete<ApiFloorIcon>(`/admin/floor-icons/${id}`);
}
