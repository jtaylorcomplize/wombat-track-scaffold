import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    proxy: {
      // Proxy admin API calls to admin server
      '/api/admin': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      // Proxy orbis API calls to admin server
      '/api/orbis': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      // Proxy MCP API calls to admin server
      '/api/mcp': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      // Proxy other API calls to main backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
});
