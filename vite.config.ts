import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['mtg-ruler.onrender.com'],
    host: '0.0.0.0', // (recommended for Render or similar services)
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173 // (recommended for hosting platforms)
  }
})
