import axios from 'axios';

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
).replace(/\/+$/, '');

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
    const response = await axios.request<T>({
      ...options,
      url: `${BASE_URL}${path}`,
      headers,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const text = typeof error.response.data === 'string' ? error.response.data.slice(0, 200) : JSON.stringify(error.response.data).slice(0, 200);
      throw new Error(
        `API request failed: ${error.response.status} ${error.response.statusText}${text ? `: ${text}` : ''}`
      );
    }
    throw error;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
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
