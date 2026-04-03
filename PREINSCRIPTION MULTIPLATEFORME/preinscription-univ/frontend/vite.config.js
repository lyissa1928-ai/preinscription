import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Fusionne les VITE_* du monorepo (racine) et du dossier frontend — le frontend l’emporte. */
function mergedViteEnv(mode) {
  const rootDir = path.resolve(__dirname, '..')
  const fromRoot = loadEnv(mode, rootDir, 'VITE_')
  const fromFrontend = loadEnv(mode, __dirname, 'VITE_')
  return { ...fromRoot, ...fromFrontend }
}

export default defineConfig(({ mode }) => {
  const v = mergedViteEnv(mode)
  return {
  plugins: [react()],
  /** Garantit que les clés publiques sont bien prises si .env.production est à la racine du repo. */
  define: {
    'import.meta.env.VITE_RECAPTCHA_SITE_KEY': JSON.stringify(v.VITE_RECAPTCHA_SITE_KEY ?? ''),
    'import.meta.env.VITE_API_URL': JSON.stringify(v.VITE_API_URL ?? ''),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    /** IPv4 explicite : évite les écarts localhost IPv4 vs ::1 (page blanche / mauvaise appli). */
    host: '127.0.0.1',
    port: 5173,
    /** Si le port est pris, échouer au lieu de passer silencieusement à 5174. */
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  /** Même proxy qu’en dev pour `vite preview` (npm run start à la racine du monorepo). */
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
  }
})
