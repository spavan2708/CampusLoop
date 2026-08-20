import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const portalRoot = path.dirname(fileURLToPath(import.meta.url))
const legacyApi = path.resolve(portalRoot, '../../frontend/src/services/api.js')

export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: legacyApi, replacement: path.resolve(portalRoot, 'src/api.js') }] },
  server: { port: 5174, strictPort: true },
})
