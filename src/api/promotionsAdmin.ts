import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { ApiFileAsset } from "./types";

export interface PromotionAdminStore {
  id: string;
  name: string;
  slug: string;
  roomNumber: string | null;
  tenantId: string | null;
  isActive: boolean;
  isVisible: boolean;
}

export interface PromotionAdminImageAsset {
  id: string;
  filename: string;
  url: string;
  mimeType: string | null;
  kind: string;
}

export interface PromotionAdmin {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  terms: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  store: PromotionAdminStore | null;
  storeId: string | null;
  tenantId: string | null;
  imageAsset: PromotionAdminImageAsset | null;
  imageAssetId: string | null;
  createdById: string | null;
  updatedById: string | null;
}

export interface CreatePromotionInput {
  title: string;
  slug: string;
  description?: string | null;
  terms?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  tenantId?: string | null;
  storeId?: string | null;
  imageAssetId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown> | null;
}

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export function fetchAdminPromotions(): Promise<PromotionAdmin[]> {
  return apiGet<PromotionAdmin[]>("/admin/promotions");
}

export function fetchAdminPromotion(id: string): Promise<PromotionAdmin> {
  return apiGet<PromotionAdmin>(`/admin/promotions/${id}`);
}

export function createAdminPromotion(dto: CreatePromotionInput): Promise<PromotionAdmin> {
  return apiPost<PromotionAdmin>("/admin/promotions", dto);
}

export function updateAdminPromotion(id: string, dto: UpdatePromotionInput): Promise<PromotionAdmin> {
  return apiPatch<PromotionAdmin>(`/admin/promotions/${id}`, dto);
}

export function deleteAdminPromotion(id: string): Promise<PromotionAdmin> {
  return apiDelete<PromotionAdmin>(`/admin/promotions/${id}`);
}