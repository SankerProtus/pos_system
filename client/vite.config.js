import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          lucide: ['lucide-react'],
          axios: ['axios'],
          'react-router': ['react-router-dom'],
          'react-hot-toast': ['react-hot-toast'],
          'react-query': ['@tanstack/react-query'],
          'forms': ['react-hook-form', '@hookform/resolvers'],
          'zod': ['zod'],
          'chart': ['recharts'],
        }
      }
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false
      }
    }
  }
})
