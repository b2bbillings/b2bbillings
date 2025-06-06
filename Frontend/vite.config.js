import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    watch: {
      usePolling: true,  // Essential for macOS
      interval: 100
    },
    hmr: {
      overlay: true
    }
  },
  optimizeDeps: {
    force: true
  }
})