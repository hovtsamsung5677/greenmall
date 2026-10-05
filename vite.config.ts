import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import os from 'node:os';

/**
 * Dev-плагин: отдаёт в клиент IP-адрес компьютера в локальной сети.
 *
 * Нужен, чтобы QR-код с маршрутом не содержал `localhost`: на телефоне
 * `localhost` указывает на сам телефон, и страница не открывается.
 * Виртуальные адаптеры (WSL, Hyper-V, tun/VPN) пропускаем.
 */
type NetInfo = { address: string; family: string; internal: boolean };

function findLanIPv4(): string | null {
  // Ключ объекта — имя сетевого интерфейса, по нему отсекаем виртуальные адаптеры.
  const nets = os.networkInterfaces() as unknown as Record<string, NetInfo[] | undefined>;
  // Префиксное сравнение: имя адаптера может быть tun0/tap1, поэтому \b не подходит.
  const isVirtual = /^(loopback|tun|tap|wsl|veth|vbox|vmnet|npcap|hyper-?v)/i;

  for (const [iface, list] of Object.entries(nets)) {
    if (isVirtual.test(iface)) continue;
    for (const net of list ?? []) {
      if (net.family !== 'IPv4') continue;
      if (net.internal) continue;
      return net.address;
    }
  }
  return null;
}

function devLanHostPlugin(): Plugin {
  const host = findLanIPv4();
  if (host) {
    console.log(`\n  [lan] QR-код маршрута будет доступен с телефона: http://${host}:<порт vite>`);
  } else {
    console.warn('\n  [lan] Не найден LAN-адрес — QR-код придётся открывать вручную.');
  }
  return {
    name: 'greenmall:dev-lan-host',
    // apply: 'serve' — иначе LAN-IP пользователя попадёт в production-бандл.
    apply: 'serve',
    config: () => ({
      define: { 'import.meta.env.DEV_LAN_HOST': JSON.stringify(host ?? '') },
    }),
  };
}
// 127.0.0.1, а не localhost: на Windows localhost резолвится в ::1,
// а Nest слушает на 0.0.0.0 (IPv4) — соединение не устанавливается.
const backendProxy = {
  target: 'http://127.0.0.1:3000',
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react(), devLanHostPlugin()],
  server: {
    // По умолчанию Vite слушает только loopback, и телефон в той же Wi-Fi-сети
    // не может открыть страницу. host: true поднимает сервер на 0.0.0.0.
    host: true,
    proxy: {
      '/api': backendProxy,
      // Статика бэкенда (express.static отдаёт public/ в корне, минуя global prefix 'api'):
      // /uploads — картинки/медиа ассетов и баннеров.
      // Без этого правила Vite отвечает SPA-fallback'ом (index.html), и ассеты не отображаются.
      // /floors проксировать НЕЛЬЗЯ: эти модели лежат в frontend/public/floors
      // (в т.ч. 0_floor.glb, которого нет на бэкенде) и их отдаёт сам Vite.
      '/uploads': backendProxy,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // React — отдельно: меняется редко, кешируется надолго.
          if (id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/react-dom/')) return 'vendor-react';
          if (id.includes('node_modules/scheduler/')) return 'vendor-react';

          // three.js ядро — самое тяжёлое, но стабильное между релизами.
          if (id.includes('node_modules/three/')) return 'vendor-three';

          // R3F и drei меняются чаще, чем ядро three — отдельные чанки.
          if (id.includes('node_modules/@react-three/fiber')) return 'vendor-r3f';
          if (id.includes('node_modules/@react-three/drei')) return 'vendor-drei';

          // Прочие утилиты — в один "vendor".
          return 'vendor';
        },
      },
    },
  },
});
