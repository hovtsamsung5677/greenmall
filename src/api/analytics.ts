import axios from 'axios';
import { API_BASE_URL } from './env';
import { apiGet, getAccessToken } from './client';

export type AnalyticsExportFormat = 'csv' | 'xlsx';

export interface NavigationAnalyticsQuery {
  from?: string;
  to?: string;
  panelId?: string;
  source?: 'PANEL' | 'MOBILE';
}

export interface NavigationAnalyticsSummary {
  from: string | null;
  to: string | null;
  panelClicks: number;
  panelClicksToday: number;
  routesBuilt: number;
  qrScans: number;
  sessionsStarted: number;
  mobileOpened: number;
  uniqueSessions: number;
}

export interface NavigationAnalyticsDailyItem {
  date: string;
  panelClicks: number;
  routesBuilt: number;
  qrScans: number;
  sessions: number;
}

export interface NavigationAnalyticsDailySeries {
  from: string;
  to: string;
  items: NavigationAnalyticsDailyItem[];
}

export interface NavigationAnalyticsHourlyItem {
  hour: number;
  events: number;
}

export interface NavigationAnalyticsHourlySeries {
  from: string;
  to: string;
  items: NavigationAnalyticsHourlyItem[];
}

export interface NavigationAnalyticsStore {
  id: string;
  name: string;
  slug: string;
  floorNumber: number | null;
}

export interface NavigationAnalyticsRoutesByStoreItem {
  storeId: string;
  store: NavigationAnalyticsStore | null;
  routesBuilt: number;
}

export interface NavigationAnalyticsRoutesByStoreResponse {
  from: string | null;
  to: string | null;
  items: NavigationAnalyticsRoutesByStoreItem[];
}

function toSearchParams(query: NavigationAnalyticsQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.panelId) params.set('panelId', query.panelId);
  if (query.source) params.set('source', query.source);
  return params.toString();
}

export function fetchNavigationSummary(
  query: NavigationAnalyticsQuery = {},
): Promise<NavigationAnalyticsSummary> {
  const search = toSearchParams(query);
  return apiGet<NavigationAnalyticsSummary>(
    `/admin/analytics/navigation/summary${search ? `?${search}` : ''}`,
  );
}

export function fetchNavigationDaily(
  query: NavigationAnalyticsQuery = {},
): Promise<NavigationAnalyticsDailySeries> {
  const search = toSearchParams(query);
  return apiGet<NavigationAnalyticsDailySeries>(
    `/admin/analytics/navigation/daily${search ? `?${search}` : ''}`,
  );
}

export function fetchNavigationHourly(
  query: NavigationAnalyticsQuery = {},
): Promise<NavigationAnalyticsHourlySeries> {
  const search = toSearchParams(query);
  return apiGet<NavigationAnalyticsHourlySeries>(
    `/admin/analytics/navigation/hourly${search ? `?${search}` : ''}`,
  );
}

export function fetchNavigationRoutesByStore(
  query: NavigationAnalyticsQuery = {},
): Promise<NavigationAnalyticsRoutesByStoreResponse> {
  const search = toSearchParams(query);
  return apiGet<NavigationAnalyticsRoutesByStoreResponse>(
    `/admin/analytics/navigation/routes-by-store${search ? `?${search}` : ''}`,
  );
}

export async function downloadExportBlob(
  endpoint: string,
  query: NavigationAnalyticsQuery & { format?: AnalyticsExportFormat },
  suggestedFilename: string,
): Promise<void> {
  const params = new URLSearchParams();
  if (query.format) params.set('format', query.format);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.panelId) params.set('panelId', query.panelId);
  if (query.source) params.set('source', query.source);

  const token = getAccessToken();
  const requestUrl = `${API_BASE_URL}/${endpoint.replace(/^\/+/, '')}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await axios.get<Blob>(requestUrl, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const disposition = response.headers['content-disposition'];
  let filename = suggestedFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="([^"]+)"/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
