import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Base path for GitHub Pages "project page" (https://user.github.io/MisanRD/).
// Override with VITE_BASE=/ for a custom domain or user/org page.
const base = process.env.VITE_BASE ?? '/MisanRD/'

// https://vite.dev/config/
export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'MisanRD — Administración de Sanes',
        short_name: 'MisanRD',
        description: 'Administra tus Sanes (SUSU) desde el celular: participantes, cuotas, pagos, morosos, entregas y recibos.',
        theme_color: '#1E63F0',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'es-DO',
        categories: ['finance', 'business', 'productivity'],
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,html,ico,png,svg,woff2}', 'assets/index-*.js', 'assets/vendor-*.js'],
        // Chunks pesados de carga diferida: no se precachean, se cachean en runtime.
        globIgnores: ['**/pdf-*.js', '**/charts-*.js', '**/xlsx-*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Chunks JS de carga diferida (rutas lazy, pdf/charts/xlsx) que NO se
            // precachean. Sin esta regla, offline o tras un deploy fallan al cargar
            // (404 del hash viejo) → pantalla en blanco. Los nombres llevan hash
            // (inmutables), así que CacheFirst es seguro; el cache queda acotado.
            urlPattern: ({ url, request, sameOrigin }) =>
              request.destination === 'script' &&
              sameOrigin &&
              url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache GET reads from the Supabase REST/storage layer for basic offline resilience.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /\.supabase\.co\/(rest|storage)\//.test(url.href),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-read',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@react-pdf') || id.includes('react-pdf')) return 'pdf'
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) return 'charts'
          if (id.includes('xlsx')) return 'xlsx'
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('react-router') ||
            id.includes('@tanstack') ||
            id.includes('@supabase') ||
            id.includes('lucide-react') ||
            id.includes('date-fns') ||
            // clsx = base de cn(), usado en cada pantalla. DEBE ir en 'vendor'
            // (precacheado). Sin esto Rollup lo mete en el chunk 'charts' (que NO
            // se precachea) y el entry pasa a importarlo estáticamente → offline o
            // tras un deploy la app no monta → pantalla en blanco antes de React.
            id.includes('/clsx')
          ) {
            return 'vendor'
          }
        },
      },
    },
  },
})
