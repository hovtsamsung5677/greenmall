import axios from 'axios';
import { apiGet, apiPost, apiPatch, apiDelete, getAccessToken } from './client';
import type { ApiFileAsset } from './types';

export interface CreateFileAssetInput {
  filename: string;
  url: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  path?: string | null;
  provider?: string | null;
  kind?: string;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateFileAssetInput {
  filename?: string;
  url?: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  path?: string | null;
  provider?: string | null;
  kind?: string;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url || !url.startsWith('/')) return url ?? '';
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
  const origin = baseUrl.replace(/\/api$/, '');
  return `${origin}${url}`;
}

export function fetchFileAssets(): Promise<ApiFileAsset[]> {
  return apiGet<ApiFileAsset[]>('/admin/file-assets');
}

export function fetchFileAsset(id: string): Promise<ApiFileAsset> {
  return apiGet<ApiFileAsset>(`/admin/file-assets/${id}`);
}

export function createFileAsset(dto: CreateFileAssetInput): Promise<ApiFileAsset> {
  return apiPost<ApiFileAsset>('/admin/file-assets', dto);
}

export async function uploadFileAsset(file: File, kind?: string): Promise<ApiFileAsset> {
  const form = new FormData();
  form.append('file', file);
  if (kind) {
    form.append('kind', kind);
  }

  const token = getAccessToken();
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
  const origin = baseUrl.replace(/\/api$/, '');

  try {
    const response = await axios.post<ApiFileAsset>(`${baseUrl}/admin/file-assets/upload`, form, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const asset = response.data;
    if (asset.url && asset.url.startsWith('/')) {
      asset.url = `${origin}${asset.url}`;
    }
    return asset;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const text = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
      throw new Error(text || `Upload failed with status ${error.response.status}`);
    }
    throw error;
  }
}

export function updateFileAsset(id: string, dto: UpdateFileAssetInput): Promise<ApiFileAsset> {
  return apiPatch<ApiFileAsset>(`/admin/file-assets/${id}`, dto);
}

export function deleteFileAsset(id: string): Promise<ApiFileAsset> {
  return apiDelete<ApiFileAsset>(`/admin/file-assets/${id}`);
}
