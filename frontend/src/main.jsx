import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { reportClientError } from './utils/reportClientError'
import { resolveApiBaseUrl } from './utils/resolveApiBaseUrl'
import { setupAuthInterceptors } from './lib/setupAuthInterceptors'
import { getRouterBasename } from './utils/appBasePath'
import './index.css'
import './lettre-print-additive.css'

const apiBase = resolveApiBaseUrl()
if (apiBase) {
  axios.defaults.baseURL = apiBase
}
/** Évite un chargement infini si l’API ne répond pas (écran blanc / spinner bloqué). */
axios.defaults.timeout = 25000
setupAuthInterceptors()

window.addEventListener('error', (ev) => {
  reportClientError({
    type: 'window-error',
    message: ev.message,
    filename: ev.filename,
    lineno: ev.lineno,
    colno: ev.colno,
  })
})

window.addEventListener('unhandledrejection', (ev) => {
  const r = ev.reason
  reportClientError({
    type: 'unhandledrejection',
    message: r?.message != null ? String(r.message) : String(r),
    stack: r?.stack,
  })
})

window.addEventListener('error', (ev) => {
  reportClientError({
    type: 'window-error',
    message: ev.message,
    filename: ev.filename,
    lineno: ev.lineno,
    colno: ev.colno,
  })
})

window.addEventListener('unhandledrejection', (ev) => {
  const r = ev.reason
  reportClientError({
    type: 'unhandledrejection',
    message: r?.message != null ? String(r.message) : String(r),
    stack: r?.stack,
  })
})

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Élément #root introuvable dans index.html.')
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={getRouterBasename() || undefined}>
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
