import { apiGet, apiDelete, apiPatch, apiPost, type AdminUser } from './client';

export interface HeaderBanner {
  id: string;
  title: string;
  subtitle: string | null;
  linkUrl: string | null;
  asset: {
    id: string;
    filename: string;
    url: string;
    mimeType: string | null;
  } | null;
  targetStore: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isActive: boolean;
  sortOrder: number;
  placement: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAdminHeaderBanners(
  page = 1,
  limit = 20,
): Promise<{ items: HeaderBanner[]; total: number }> {
  return apiGet<{ items: HeaderBanner[]; total: number }>(
    `/admin/header-banners?page=${page}&limit=${limit}`,
  );
}

export async function fetchActiveHeaderBanner(): Promise<HeaderBanner> {
  return apiGet<HeaderBanner>('/public/header-banners/active');
}

export async function createHeaderBanner(
  dto: {
    title: string;
    subtitle?: string;
    linkUrl?: string;
    assetId?: string;
    targetStoreId?: string;
    isActive?: boolean;
    sortOrder?: number;
  },
): Promise<HeaderBanner> {
  return apiPost<HeaderBanner>('/admin/header-banners', dto);
}

export async function updateHeaderBanner(
  id: string,
  dto: {
    title?: string;
    subtitle?: string;
    linkUrl?: string;
    assetId?: string;
    targetStoreId?: string;
    isActive?: boolean;
    sortOrder?: number;
  },
): Promise<HeaderBanner> {
  return apiPatch<HeaderBanner>(`/admin/header-banners/${id}`, dto);
}

export async function deleteHeaderBanner(id: string): Promise<HeaderBanner> {
  return apiDelete<HeaderBanner>(`/admin/header-banners/${id}`);
}
