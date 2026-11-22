/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Pescadex',
        short_name: 'Pescadex',
        description: 'La Pokédex de pesca del grupo',
        lang: 'es',
        display: 'standalone',
        start_url: '/',
        background_color: '#f4f1ea',
        theme_color: '#0b4f6c',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  optimizeDeps: { include: ['piexifjs', 'browser-image-compression'] },
  test: { globals: true },
});
