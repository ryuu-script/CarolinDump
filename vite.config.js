/*
Purpose: Configures Vite: enables React and proxies /api calls to the Node API server in development.
Dependencies: NULL
*/
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3001' },
  },
})