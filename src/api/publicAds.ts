import { apiGet, apiPost } from './client';
import type { PublicAd } from './types';

export interface TrackAdEventInput {
  campaignId: string;
  slotCode: string;
  eventType: 'AD_IMPRESSION' | 'AD_CLICK';
  source?: 'PANEL' | 'MOBILE';
  sessionId?: string;
  storeId?: string | null;
  creativeId?: string | null;
  payload?: Record<string, unknown>;
}

/** Получить объявление для слота (публичный эндпоинт). */
export function fetchPublicAd(slotCode: string): Promise<PublicAd> {
  return apiGet<PublicAd>(`/public/ads/slots/${encodeURIComponent(slotCode)}`);
}

/** Отправить трекинг события показа/клика по рекламе. */
export function trackAdEvent(input: TrackAdEventInput): void {
  void apiPost<unknown>(
    '/public/analytics/events',
    {
      type: input.eventType,
      source: input.source ?? 'MOBILE',
      sessionId: input.sessionId,
      campaignId: input.campaignId,
      storeId: input.storeId,
      creativeId: input.creativeId,
      payload: { slotCode: input.slotCode, ...input.payload },
    },
    false,
  ).catch(() => {
    // Аналитика рекламы не должна ломать интерфейс.
  });
}
