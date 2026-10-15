import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Sends fetch("/api/...") from the React app to the Node server (npm run server).
    proxy: { '/api': 'http://localhost:3001' },
  },
})