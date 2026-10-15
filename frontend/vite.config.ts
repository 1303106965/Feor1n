import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base 固定为 /spa/：构建产物部署在 wwwroot/spa 下，由 ASP.NET Core 统一服务。
export default defineConfig({
  base: '/spa/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../src/OurStory.Web/wwwroot/spa',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5080',
      '/uploads': 'http://127.0.0.1:5080',
      '/media': 'http://127.0.0.1:5080',
      '/admin': 'http://127.0.0.1:5080',
      '/affinity': 'http://127.0.0.1:5080',
      '/cycles': 'http://127.0.0.1:5080',
      '/shop': 'http://127.0.0.1:5080',
      '/logout': 'http://127.0.0.1:5080',
      '/error': 'http://127.0.0.1:5080',
      '/assets': 'http://127.0.0.1:5080',
      '/manifest.webmanifest': 'http://127.0.0.1:5080',
      '/sw.js': 'http://127.0.0.1:5080',
      '/favicon.ico': 'http://127.0.0.1:5080',
    },
  },
});
