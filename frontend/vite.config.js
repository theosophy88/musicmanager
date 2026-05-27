import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    // In Docker the root Dockerfile overrides this with --outDir /frontend/dist
    // For local "npm run build" it writes next to the backend's static folder
    outDir: process.env.DOCKER_BUILD ? 'dist' : '../backend/static',
    emptyOutDir: true,
  },
}))
