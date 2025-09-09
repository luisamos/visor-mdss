// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/visor/',
  optimizeDeps: {
    include: ['ol'],
  },
  build: {
    sourcemap: true,
    manifest: true,
    chunkSizeWarningLimit: 100000,
  },
  preview: {
    port: 81,
  },
  define: {
    global: 'globalThis'
  },
  server: {
    host: '127.0.0.9',
    port: 81,
  }
});
