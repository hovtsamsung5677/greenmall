/**
 * Базовые URL API — единственный источник правды.
 *
 * Значение по умолчанию — относительный путь `/api`, а не
 * `http://localhost:3000/api`. Причина: страница маршрута открывается с
 * телефона по QR-коду, и абсолютный localhost на телефоне указывает на сам
 * телефон — и API, и картинки, и 3D-модели перестают грузиться.
 *
 * Относительный путь работает в обоих режимах:
 *  - dev: Vite проксирует /api на backend (server.proxy в vite.config.ts);
 *  - production: переопределяется через VITE_API_BASE_URL.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? '/api'
).replace(/\/+$/, '');

/** Origin без префикса /api — для статики, которую отдаёт backend. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
