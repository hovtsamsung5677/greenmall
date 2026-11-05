import axios from 'axios';
import { API_BASE_URL as BASE_URL } from './env';

const httpClient = axios.create({
  baseURL: BASE_URL,
  headers: { Accept: 'application/json' },
});

interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly details: unknown;

  constructor(
    message: string,
    options: {
      status?: number | null;
      code?: string | null;
      details?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.details = options.details;
  }
}

function extractPayloadMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const message = (data as ApiErrorPayload).message;
  if (Array.isArray(message)) return message.filter(Boolean).join('. ');
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

function userMessageForStatus(status: number, payloadMessage: string | null): string {
  if (status === 400 || status === 409 || status === 422) {
    return payloadMessage ?? 'Проверьте введённые данные и повторите попытку.';
  }
  if (status === 401) return 'Сессия истекла. Войдите в систему ещё раз.';
  if (status === 403) return 'У вас недостаточно прав для этого действия.';
  if (status === 404) return payloadMessage ?? 'Запрошенные данные не найдены.';
  if (status === 413) return 'Файл слишком большой.';
  if (status === 429) return 'Слишком много запросов. Попробуйте немного позже.';
  return 'Сервис временно недоступен. Попробуйте позже.';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const details = error.response?.data;
    const payload = details && typeof details === 'object' ? (details as ApiErrorPayload) : null;
    const message = status
      ? userMessageForStatus(status, extractPayloadMessage(details))
      : 'Не удалось связаться с сервером. Проверьте подключение к сети.';

    return new ApiError(message, {
      status,
      code: typeof payload?.code === 'string' ? payload.code : null,
      details,
      cause: error,
    });
  }

  return new ApiError('Произошла непредвиденная ошибка. Попробуйте ещё раз.', {
    cause: error,
  });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

async function request<T>(
  path: string,
  options: Parameters<typeof axios.request>[0] = {},
  sendAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (sendAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await httpClient.request<T>({
      ...options,
      url: path,
      headers,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { signal });
}

export async function publicApiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { signal }, false);
}

export async function fetchCurrentUser(): Promise<AdminUser> {
  return request<AdminUser>('/auth/me');
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  sendAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  return request<T>(
    path,
    {
      method: 'POST',
      data: JSON.stringify(body),
      headers,
    },
    sendAuth,
  );
}

export async function publicApiPost<T>(path: string, body: unknown): Promise<T> {
  return apiPost<T>(path, body, false);
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  sendAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  return request<T>(
    path,
    {
      method: 'PATCH',
      data: JSON.stringify(body),
      headers,
    },
    sendAuth,
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
  });
}

export function getAccessToken(): string | null {
  try {
    const item = localStorage.getItem('greenmall_admin');
    if (!item) return null;
    const parsed = JSON.parse(item) as { accessToken?: string };
    return parsed.accessToken ?? null;
  } catch {
    return null;
  }
}

export function setAccessToken(accessToken: string): void {
  const existing = localStorage.getItem('greenmall_admin');
  const payload = existing ? JSON.parse(existing) : {};
  payload.accessToken = accessToken;
  localStorage.setItem('greenmall_admin', JSON.stringify(payload));
}

export function clearAccessToken(): void {
  localStorage.removeItem('greenmall_admin');
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AdminUser;
}
