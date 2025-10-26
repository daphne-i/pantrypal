// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // <-- Import the plugin
const repoName = 'pantrypal';

export default defineConfig({
  base: `/${repoName}/`,
  plugins: [
    react(),
    VitePWA({ // <-- Add the PWA plugin configuration
      registerType: 'autoUpdate', // Automatically update when a new service worker is found
      injectRegister: 'auto',     // Let the plugin handle service worker registration script injection
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,ttf,woff,woff2}'], // Cache essential assets
        // Optional: Cache Google Fonts if you use them
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'PantryPal',
        short_name: 'PantryPal',
        description: 'Your personal pantry and grocery tracker.',
        theme_color: '#3b82f6', // Example: Ocean theme primary color
        background_color: '#f0f9ff', // Example: Ocean theme background color
        display: 'standalone', // Make it feel like a native app
        scope: `/${repoName}/`,
        start_url: `/${repoName}/`,
        icons: [
          { // You NEED to create these icons and place them in public/icons/
            src: '/icons/icon-192x192.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        
        ]
      }
    })
  ],
});