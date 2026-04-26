import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Default dev URL: http://localhost:5173  (must match an *running* `npm run dev`)
    port: 5173,
    // If 5173 is already in use, Vite picks the next free port — watch the terminal for the real URL
    strictPort: false,
    host: 'localhost',
  },
})
