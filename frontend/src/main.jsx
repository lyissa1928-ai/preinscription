import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import './lettre-print-additive.css'

axios.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 403 && err.response?.data?.code === 'MUST_CHANGE_PASSWORD') {
      if (!window.location.pathname.startsWith('/changer-mot-de-passe-obligatoire')) {
        window.location.assign('/changer-mot-de-passe-obligatoire')
      }
    }
    return Promise.reject(err)
  }
)

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Élément #root introuvable dans index.html.')
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
