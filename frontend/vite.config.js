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
    port: Number(v.VITE_DEV_SERVER_PORT) || 5173,
    /** Si le port est pris (ex. double `npm run dev`), passer à 5174 — CORS backend inclut 5173–5174. */
    strictPort: false,
    proxy: {
      '/api': {
        target: v.VITE_PROXY_API_TARGET || 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
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
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
  build: {
    rollupOptions: {
      output: {
        /** Découpage ciblé (évite le chunk « vendor » générique qui crée des cycles avec React). */
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('socket.io-client')) return 'socket'
          if (id.includes('react-quill') || id.includes('node_modules/quill')) return 'quill'
          if (id.includes('jspdf')) return 'jspdf'
        },
      },
    },
  },
  }
})
