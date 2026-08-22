import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { ApiRouteNode, ApiRouteNodeType } from './types';

export interface CreateRouteNodeInput {
  floorId: string;
  type?: ApiRouteNodeType;
  name?: string;
  code?: string;
  x: number;
  y: number;
  z?: number;
  mapObjectId?: string | null;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateRouteNodeInput = Partial<CreateRouteNodeInput>;

export function fetchRouteNodes(
  floorId: string,
  includeInactive = true,
): Promise<ApiRouteNode[]> {
  const params = new URLSearchParams();
  params.set('floorId', floorId);
  if (!includeInactive) params.set('isActive', 'true');
  return apiGet<ApiRouteNode[]>(`/admin/route-nodes?${params.toString()}`);
}

export function createRouteNode(input: CreateRouteNodeInput): Promise<ApiRouteNode> {
  return apiPost<ApiRouteNode>('/admin/route-nodes', input);
}

export function updateRouteNode(
  id: string,
  input: UpdateRouteNodeInput,
): Promise<ApiRouteNode> {
  return apiPatch<ApiRouteNode>(`/admin/route-nodes/${id}`, input);
}

export function deleteRouteNode(id: string): Promise<ApiRouteNode> {
  return apiDelete<ApiRouteNode>(`/admin/route-nodes/${id}`);
}
