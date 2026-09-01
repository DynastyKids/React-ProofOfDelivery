import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appMode = env.mode === 'demo' ? 'demo' : 'production'

  return {
    plugins: [react()],
    define: {
      'import.meta.env.APP_MODE': JSON.stringify(appMode),
    },
  }
})
