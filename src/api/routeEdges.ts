import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { ApiRouteEdge } from './types';

export interface CreateRouteEdgeInput {
  floorId: string;
  fromNodeId: string;
  toNodeId: string;
  distance?: number;
  weight?: number;
  isBidirectional?: boolean;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export type UpdateRouteEdgeInput = Partial<CreateRouteEdgeInput>;

export function fetchRouteEdges(
  floorId: string,
  includeInactive = true,
): Promise<ApiRouteEdge[]> {
  const params = new URLSearchParams();
  params.set('floorId', floorId);
  if (!includeInactive) params.set('isActive', 'true');
  return apiGet<ApiRouteEdge[]>(`/admin/route-edges?${params.toString()}`);
}

export function createRouteEdge(input: CreateRouteEdgeInput): Promise<ApiRouteEdge> {
  return apiPost<ApiRouteEdge>('/admin/route-edges', input);
}

export function updateRouteEdge(
  id: string,
  input: UpdateRouteEdgeInput,
): Promise<ApiRouteEdge> {
  return apiPatch<ApiRouteEdge>(`/admin/route-edges/${id}`, input);
}

export function deleteRouteEdge(id: string): Promise<ApiRouteEdge> {
  return apiDelete<ApiRouteEdge>(`/admin/route-edges/${id}`);
}
