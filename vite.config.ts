import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nansen': {
        target: 'https://api.nansen.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nansen/, ''),
        secure: true,
      },
    },
  },
})
