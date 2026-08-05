import { apiGet } from './client';
import type { ApiCategory, ApiStore } from './types';

export function fetchCategories(): Promise<ApiCategory[]> {
  return apiGet<ApiCategory[]>('/public/categories');
}

export function fetchStores(limit = 100): Promise<ApiStore[]> {
  return apiGet<ApiStore[]>(`/public/stores?limit=${limit}`);
}
