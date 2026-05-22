/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3045,
    proxy: {
      // Proxy every backend surface to the FastAPI container's host port
      // (matches docker-compose.dev.yml `${APP_PORT:-8045}:8030`).
      '/api': 'http://localhost:8045',
      '/health': 'http://localhost:8045',
      '/tools': 'http://localhost:8045',
      '/step': 'http://localhost:8045',
      '/snapshot': 'http://localhost:8045',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
})
