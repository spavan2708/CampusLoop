import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const portalRoot = path.dirname(fileURLToPath(import.meta.url))
const legacyApi = path.resolve(portalRoot, '../../frontend/src/services/api.js')
const portalApi = path.resolve(portalRoot, 'src/api.js')

const isolateAdminApi = {
  name: 'isolate-admin-api',
  enforce: 'pre',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.')) return null
    return path.resolve(path.dirname(importer), source) === legacyApi ? portalApi : null
  },
}

export default defineConfig({ plugins: [isolateAdminApi, react()], server: { port: 5175, strictPort: true } })
