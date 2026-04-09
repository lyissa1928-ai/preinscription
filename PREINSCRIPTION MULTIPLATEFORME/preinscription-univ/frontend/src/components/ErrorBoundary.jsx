import { Component } from 'react'
import { reportClientError } from '../utils/reportClientError'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
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
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-6 text-center">
          <p className="text-lg font-bold text-slate-900">Une erreur a interrompu l’affichage</p>
          <p className="mt-2 text-sm text-slate-600 max-w-lg break-words font-mono">{String(this.state.error?.message || this.state.error)}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={() => window.location.reload()}
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
