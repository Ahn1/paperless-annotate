/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * App-Version für Anzeige & Update-Check:
 * 1. APP_VERSION-Env (Docker-Build ohne .git, gesetzt von deploy/update.sh)
 * 2. git describe (Tag oder "vX.Y.Z-<n>-g<hash>" zwischen Releases)
 * 3. package.json (wird vom Release-Skript synchron zum Tag gehalten)
 */
function resolveAppVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION
  try {
    return execSync('git describe --tags --always', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string }
    return `v${pkg.version}`
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': neue Version wird nicht stillschweigend aktiviert, sondern per
      // Update-Banner angeboten (src/features/shell/UpdateBanner.tsx)
      registerType: 'prompt',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'Paperless Annotator',
        short_name: 'Annotator',
        description: 'Paperless-ngx-Client mit PDF-Annotation und Dokumentversionierung',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#18181b',
        background_color: '#18181b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: 'screenshots/wide.png', sizes: '3196x1715', type: 'image/png', form_factor: 'wide' },
          { src: 'screenshots/high.png', sizes: '2077x1844', type: 'image/png' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Thumbnails & Previews des Paperless-Servers (beliebige Origin) offline vorhalten
            urlPattern: /\/api\/documents\/\d+\/(thumb|preview)\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'paperless-media',
              expiration: { maxEntries: 500, maxAgeSeconds: 14 * 24 * 60 * 60, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Stammdaten-Antworten kurz cachen (App-Start offline)
            urlPattern: /\/api\/(tags|correspondents|document_types|storage_paths|custom_fields|saved_views)\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'paperless-masterdata',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})
