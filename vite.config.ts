import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/aversi': {
          target: 'https://www.aversi.ge',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/aversi/, ''),
          headers: {
            Referer: 'https://www.aversi.ge/',
            Origin: 'https://www.aversi.ge',
          }
        },
        '/api/psp': {
          target: 'https://psp.ge',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/psp/, ''),
          headers: {
            Referer: 'https://psp.ge/',
            Origin: 'https://psp.ge',
          }
        }
      }
    },
  };
});
