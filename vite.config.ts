import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
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
