import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const portalRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({ plugins: [react()], server: { port: 5175, strictPort: true } })
