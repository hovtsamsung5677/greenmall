const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
).replace(/\/+$/, '');

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`
    );
  }

  return response.json() as Promise<T>;
}
