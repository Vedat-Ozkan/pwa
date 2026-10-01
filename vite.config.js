import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'
import process from 'process'

// Shown on the home page so we can tell which build a phone is running.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? execSync('git rev-parse HEAD').toString()).slice(0, 7)
const appVersion = `${commit} · ${new Date().toISOString().slice(0, 10)}`

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  server: {
    watch: { ignored: ['**/api/**'] },
    fs: { deny: ['api'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    exclude: ['node_modules', 'dist'],
  },
  optimizeDeps: {
    // Only crawl src/ for dep discovery — keeps Vite away from api/ entirely
    entries: ['./src/**/*.{js,jsx,ts,tsx}'],
    // Exclude server-only packages — never bundle these for the browser
    exclude: ['puppeteer-core', 'puppeteer', '@sparticuz/chromium-min'],
  },
  plugins: [
    react(),
    VitePWA({
      // The new worker takes over immediately; App.jsx then offers the reload
      // so nobody loses a half-filled report.
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'HSX Roofing Field Reports',
        short_name: 'HSX Reports',
        description: 'HSX Roofing field report management',
        theme_color: '#10243e',
        background_color: '#10243e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['api/**', '**/api/**'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
