import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/leaflet/')) return 'map-engine';
          if (['/node_modules/react/', '/node_modules/react-dom/', '/node_modules/scheduler/'].some((path) => id.includes(path))) return 'react-runtime';
        },
      },
    },
  },
});
