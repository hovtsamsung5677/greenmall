import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import os from 'node:os';

type NetInfo = { address: string; family: string; internal: boolean };

function findLanIPv4(): string | null {
  const nets = os.networkInterfaces() as unknown as Record<string, NetInfo[] | undefined>;
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
    apply: 'serve',
    config: () => ({
      define: { 'import.meta.env.DEV_LAN_HOST': JSON.stringify(host ?? '') },
    }),
  };
}

const backendProxy = {
  // По умолчанию проксим на локальный backend (http://localhost:3000).
  // В Docker-контейнере можно переопределить через VITE_BACKEND_TARGET=http://backend:3000.
  target: process.env.VITE_BACKEND_TARGET ?? 'http://localhost:3000',
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react(), devLanHostPlugin()],
  server: {
    host: true,
    proxy: {
      '/api': backendProxy,
      '/uploads': backendProxy,
      // WebSocket proxy for the socket.io nalytics namespace (dev only).
      // In dev Vite serves the frontend on :5173; backend WS is on :3000.
      '/analytics': {
        target: process.env.VITE_BACKEND_TARGET ?? 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
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

          if (id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/react-dom/')) return 'vendor-react';
          if (id.includes('node_modules/scheduler/')) return 'vendor-react';

          if (id.includes('node_modules/three/')) return 'vendor-three';

          if (id.includes('node_modules/@react-three/fiber')) return 'vendor-r3f';
          if (id.includes('node_modules/@react-three/drei')) return 'vendor-drei';

          return 'vendor';
        },
      },
    },
  },
});
