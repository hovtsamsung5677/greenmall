import { apiGet, apiPost } from './client';

export interface CreateSharedRouteResponse {
  token: string;
  expiresAt: string;
}

export function createSharedRoute(
  payload: unknown,
  ttlMinutes?: number,
): Promise<CreateSharedRouteResponse> {
  return apiPost<CreateSharedRouteResponse>('/public/shared-routes', {
    payload,
    ...(ttlMinutes ? { ttlMinutes } : {}),
  });
}

export function getSharedRoute<T = unknown>(token: string): Promise<T> {
  return apiGet<T>(`/public/shared-routes/${encodeURIComponent(token)}`);
}
