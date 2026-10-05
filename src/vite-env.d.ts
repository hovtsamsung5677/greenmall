/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SHARE_BASE_URL?: string;
  /** IP-адрес компьютера в локальной сети. Проставляется dev-плагином в vite.config.ts. */
  readonly DEV_LAN_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}