import { Component } from 'react'
import { reportClientError } from '../utils/reportClientError'
import { isChunkLoadError, tryReloadOnceForStaleChunk } from '../utils/chunkLoadRecovery'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, reloading: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    reportClientError({
      type: 'react-boundary',
      message: error?.message || String(error),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    })

    if (isChunkLoadError(error)) {
      this.setState({ reloading: true })
      if (tryReloadOnceForStaleChunk()) return
      this.setState({ reloading: false })
    }
  }

  render() {
    if (this.state.reloading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6 text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700">Mise à jour détectée — rechargement…</p>
        </div>
      )
    }

    if (this.state.error) {
      const chunk = isChunkLoadError(this.state.error)
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-6 text-center">
          <p className="text-lg font-bold text-slate-900">
            {chunk ? 'Nouvelle version disponible' : 'Une erreur a interrompu l’affichage'}
          </p>
          <p className="mt-2 max-w-lg text-sm text-slate-600">
            {chunk
              ? 'L’application a été mise à jour. Rechargez la page pour continuer (Ctrl+F5 si besoin).'
              : String(this.state.error?.message || this.state.error)}
          </p>
          {!chunk && (
            <p className="mt-2 max-w-lg break-words font-mono text-xs text-slate-500">
              {String(this.state.error?.message || this.state.error)}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={() => {
                try {
                  sessionStorage.removeItem('uniportail_chunk_reload_v1')
                } catch { /* ignore */ }
                window.location.href = `${window.location.pathname}?_v=${Date.now()}`
              }}
            >
              Recharger la page
            </button>
            <a
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Retour à l’accueil
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
