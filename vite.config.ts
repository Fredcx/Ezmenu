import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    allowedHosts: true,
    hmr: {
      overlay: true,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EzMenu - Cardápio Digital',
        short_name: 'EzMenu',
        description: 'Sistema Inteligente de Cardápio e Pedidos',
        theme_color: '#ed1b2e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/images/1.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/1.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/images/1.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
