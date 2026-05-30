import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [ react() ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    hmr: {
      clientPort: 80,
      protocol: 'ws',
    },
    watch: {
      usePolling: true,
      interval: 300,
      ignored: [ 'node_modules' ]
    }
  },
})
