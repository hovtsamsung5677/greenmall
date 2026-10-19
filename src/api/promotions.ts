import { apiGet } from './client';
import type { ApiFileAsset } from './types';

export interface PublicPromotionStore {
  id: string;
  name: string;
  slug: string;
  roomNumber: string | null;
}

export interface PublicPromotionImageAsset {
  id: string;
  filename: string;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  url: string;
  kind: string;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPromotion {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  terms: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  store: PublicPromotionStore;
  imageAsset: PublicPromotionImageAsset | null;
}

export function fetchPublicPromotions(storeId?: string, limit = 20): Promise<PublicPromotion[]> {
  const params = new URLSearchParams();
  if (storeId) params.set('storeId', storeId);
  params.set('limit', String(limit));
  return apiGet<PublicPromotion[]>(`/public/promotions?${params.toString()}`);
}

export function fetchPublicPromotion(slug: string): Promise<PublicPromotion> {
  return apiGet<PublicPromotion>(`/public/promotions/${encodeURIComponent(slug)}`);
}
