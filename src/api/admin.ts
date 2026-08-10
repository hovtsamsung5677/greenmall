import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  type AdminUser,
  type LoginResponse,
} from './client';
import type { ApiCategory, ApiStore } from './types';

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateStoreInput {
  name: string;
  slug?: string;
  categoryId?: string | null;
  description?: string;
  roomNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  workingHours?: Record<string, unknown>;
  searchKeywords?: string;
  isActive?: boolean;
  isVisible?: boolean;
}

export interface UpdateStoreInput {
  name?: string;
  slug?: string;
  categoryId?: string | null;
  description?: string;
  roomNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  workingHours?: Record<string, unknown>;
  searchKeywords?: string;
  isActive?: boolean;
  isVisible?: boolean;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/login', { email, password });
}

export async function fetchCurrentUser(): Promise<AdminUser> {
  return apiGet<AdminUser>('/auth/me');
}

export async function fetchAdminCategories(): Promise<ApiCategory[]> {
  return apiGet<ApiCategory[]>('/admin/categories');
}

export async function createAdminCategory(
  dto: CreateCategoryInput,
): Promise<ApiCategory> {
  return apiPost<ApiCategory>('/admin/categories', dto);
}

export async function updateAdminCategory(
  id: string,
  dto: UpdateCategoryInput,
): Promise<ApiCategory> {
  return apiPatch<ApiCategory>(`/admin/categories/${id}`, dto);
}

export async function deleteAdminCategory(id: string): Promise<ApiCategory> {
  return apiDelete<ApiCategory>(`/admin/categories/${id}`);
}

export async function fetchAdminStores(): Promise<ApiStore[]> {
  return apiGet<ApiStore[]>('/admin/stores');
}

export async function createAdminStore(
  dto: CreateStoreInput,
): Promise<ApiStore> {
  return apiPost<ApiStore>('/admin/stores', dto);
}

export async function updateAdminStore(
  id: string,
  dto: UpdateStoreInput,
): Promise<ApiStore> {
  return apiPatch<ApiStore>(`/admin/stores/${id}`, dto);
}

export async function deleteAdminStore(id: string): Promise<ApiStore> {
  return apiDelete<ApiStore>(`/admin/stores/${id}`);
}
