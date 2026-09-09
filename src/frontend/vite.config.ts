import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        id: '/',
        name: 'Lou Barbershop',
        short_name: 'Lou',
        description: 'Agenda y operación diaria de Lou Barbershop.',
        theme_color: '#17201c',
        background_color: '#f5f1e8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es-BO',
        shortcuts: [
          {
            name: 'Reservar cita',
            short_name: 'Reservar',
            url: '/book',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Agenda interna',
            short_name: 'Mi día',
            url: '/agenda',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/health\//],
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname === '/api/v1/public/catalog',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lou-public-catalog',
              expiration: { maxEntries: 1, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname === '/api/v1/public/availability',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lou-public-availability',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 31, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/public/appointments'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
