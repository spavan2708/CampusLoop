import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const portalRoot = path.dirname(fileURLToPath(import.meta.url))
const legacyApi = path.resolve(portalRoot, '../../frontend/src/services/api.js')
const legacyEventCard = path.resolve(portalRoot, '../../frontend/src/components/EventCard.jsx')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: legacyApi, replacement: path.resolve(portalRoot, 'src/api.js') },
      { find: legacyEventCard, replacement: path.resolve(portalRoot, 'src/components/EventCard.jsx') },
    ],
  },
  server: { port: 5173, strictPort: true },
})
