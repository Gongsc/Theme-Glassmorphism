import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  define: { __BUILD_VERSION__: JSON.stringify('1.2.0'), __BUILD_GIT_HASH__: JSON.stringify('monitor-port') },
  resolve: { alias: { '@': import.meta.dirname + '/src' } },
  server: { host: '127.0.0.1', proxy: { '/api': { target: process.env.MONITOR_HUB ?? 'http://127.0.0.1:9911', changeOrigin: true, ws: true } } },
  build: { chunkSizeWarningLimit: 1800 },
})
