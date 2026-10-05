/**
 * Базовый URL для QR-кода с маршрутом.
 *
 * Главная ловушка: в `VITE_SHARE_BASE_URL` часто остаётся `http://localhost:5173`.
 * Такой адрес рабочий на том компьютере, где открыт браузер, но НЕ рабочий на
 * телефоне: `localhost` на телефоне указывает на сам телефон, и страница не
 * открывается («не удаётся подключиться к сайту»).
 *
 * Порядок выбора:
 *   1. Явный VITE_SHARE_BASE_URL, если он не loopback;
 *   2. текущий origin браузера, если он не loopback;
 *   3. LAN-адрес компьютера из dev-плагина vite.config.ts (dev);
 *   4. иначе — текущий origin, но с предупреждением в консоли.
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

type Origin = { origin: string; hostname: string; port?: string };

/** Origin, доступный с телефона в той же сети. `null` — надёжного адреса нет. */
export function resolveShareBaseUrl(location: Origin = window.location): string {
  const configured = import.meta.env.VITE_SHARE_BASE_URL?.trim();

  if (configured) {
    try {
      const parsed = new URL(configured);
      if (!isLoopback(parsed.hostname)) return parsed.origin;
    } catch {
      // невалидный URL — падаем на следующий вариант
    }
  }

  if (!isLoopback(location.hostname)) {
    return location.origin;
  }

  // Вкладка открыта на localhost — подставляем IP компьютера в локальной сети.
  const lanHost = import.meta.env.DEV_LAN_HOST?.trim();
  if (lanHost) {
    return `http://${lanHost}:${location.port || '5173'}`;
  }

  console.warn(
    '[share] Вкладка открыта на loopback-адресе, а LAN-адрес не определён — ' +
      'QR-код с localhost не откроется на телефоне. Откройте карту по адресу ' +
      'http://<ip-компьютера>:<порт> либо задайте VITE_SHARE_BASE_URL в .env.',
  );

  return location.origin;
}

/** `true`, если QR-код всё равно ведёт на loopback и с телефона не откроется. */
export function isUnreachableFromPhone(url: string): boolean {
  try {
    return isLoopback(new URL(url).hostname);
  } catch {
    return true;
  }
}

export function buildShareUrl(token: string, location: Origin = window.location): string {
  return `${resolveShareBaseUrl(location).replace(/\/+$/, '')}/#/route/${token}`;
}