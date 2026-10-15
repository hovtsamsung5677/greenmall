import { apiPost } from './client';

/**
 * Публичная аналитика: панель и мобильная QR-страница отправляют события
 * в `POST /public/analytics/events`. Отправка fire-and-forget — посетитель
 * не должен ждать ответа, а ошибки аналитики не ломают интерфейс.
 */

export type TrackableEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'SESSION_RESET'
  | 'SEARCH_QUERY'
  | 'CATEGORY_SELECTED'
  | 'STORE_SELECTED'
  | 'STORE_CARD_VIEWED'
  | 'ROUTE_BUILT'
  | 'QR_SCANNED'
  | 'MOBILE_OPENED'
  | 'PANEL_USED';

export type TrackableSource = 'PANEL' | 'MOBILE';

export interface TrackEventInput {
  type: TrackableEventType;
  source: TrackableSource;
  sessionId?: string;
  panelId?: string;
  storeId?: string | null;
  qrToken?: string;
  query?: string;
  payload?: Record<string, unknown>;
}

const SESSION_STORAGE_KEY = 'greenmall_analytics_session';

function createClientEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Идентификатор сессии посетителя: один на загрузку страницы. */
export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = createClientEventId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return createClientEventId();
  }
}

/** Отправляет событие аналитики без ожидания результата. */
export function trackEvent(event: TrackEventInput): void {
  void apiPost<unknown>(
    '/public/analytics/events',
    {
      clientEventId: createClientEventId(),
      ...event,
    },
    false,
  ).catch(() => {
    // Аналитика не должна ломать пользовательский сценарий.
  });
}

/** Панель: начало сессии на стойке. */
export function trackPanelSessionStarted(panelId: string): void {
  trackEvent({
    type: 'SESSION_STARTED',
    source: 'PANEL',
    sessionId: getSessionId(),
    panelId,
  });
}

/** Панель: использование стойки (построен маршрут). */
export function trackPanelUsed(panelId: string): void {
  trackEvent({
    type: 'PANEL_USED',
    source: 'PANEL',
    sessionId: getSessionId(),
    panelId,
  });
}

/** Панель: маршрут до магазина построен. Панель обязательна для source=PANEL. */
export function trackRouteBuilt(
  panelId: string,
  storeId: string | null,
  payload?: Record<string, unknown>,
): void {
  trackEvent({
    type: 'ROUTE_BUILT',
    source: 'PANEL',
    sessionId: getSessionId(),
    panelId,
    storeId,
    ...(payload ? { payload } : {}),
  });
}

/** Мобильное веб-приложение: QR-код отсканирован, страница маршрута открыта. */
export function trackQrScanned(qrToken: string, storeId: string | null): void {
  trackEvent({
    type: 'QR_SCANNED',
    source: 'MOBILE',
    sessionId: getSessionId(),
    qrToken,
    storeId,
  });
}

/** Мобильное веб-приложение: открытие без QR (по ссылке). */
export function trackMobileOpened(): void {
  trackEvent({
    type: 'MOBILE_OPENED',
    source: 'MOBILE',
    sessionId: getSessionId(),
  });
}
