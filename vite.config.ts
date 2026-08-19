import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/nansen': {
          target: 'https://api.nansen.ai',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/nansen/, ''),
          secure: true,
          headers: env.NANSEN_API_KEY ? { apiKey: env.NANSEN_API_KEY } : undefined,
        },
      },
    },
  }
})
