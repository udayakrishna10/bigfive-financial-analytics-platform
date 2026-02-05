import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/ask': 'http://127.0.0.1:8000',
      '/chart-data': 'http://127.0.0.1:8000',
      '/news-sentiment': 'http://127.0.0.1:8000',
      '/big-five-dashboard': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
    port: 3000
  }
})
