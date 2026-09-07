import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

/**
 * Cloche de notifications — visible sur tous les tableaux de bord (sidebar).
 */
export default function NotificationsBell({ className = '' }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  const load = () => {
    if (!user) return
    axios
      .get('/api/notifications?limit=25')
      .then(({ data }) => {
        setItems(Array.isArray(data.items) ? data.items : [])
        setUnread(Number(data.unread) || 0)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!user) return null

  const markAll = async () => {
    try {
      await axios.post('/api/notifications/read-all')
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    } catch { /* ignore */ }
  }

  const markOne = async (id) => {
    try {
      await axios.post(`/api/notifications/${id}/read`)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
      setUnread((u) => Math.max(0, u - 1))
    } catch { /* ignore */ }
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load() }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs font-semibold text-blue-700 hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-slate-400">Aucune notification</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className={`border-b border-slate-50 px-3 py-2.5 ${n.read_at ? 'bg-white' : 'bg-amber-50/60'}`}>
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      {n.created_at ? new Date(n.created_at).toLocaleString('fr-FR') : ''}
                    </span>
                    <div className="flex gap-2">
                      {!n.read_at && (
                        <button type="button" onClick={() => markOne(n.id)} className="text-[11px] font-semibold text-slate-500 hover:underline">
                          Lu
                        </button>
                      )}
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => { markOne(n.id); setOpen(false) }}
                          className="text-[11px] font-semibold text-blue-700 hover:underline"
                        >
                          Ouvrir
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
