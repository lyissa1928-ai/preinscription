import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'

const STAFF_ROLES = new Set(['responsable', 'agent_admin', 'comptable', 'controleur_qualite'])

export default function StaffChatDocuments() {
  const { user } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!user || !STAFF_ROLES.has(user.role)) {
      setLoading(false)
      return
    }
    axios
      .get('/api/chat/documents')
      .then(({ data }) => setDocs(data.documents || []))
      .catch((e) => setErr(e.response?.data?.message || 'Chargement impossible.'))
      .finally(() => setLoading(false))
  }, [user])

  if (!user || !STAFF_ROLES.has(user.role)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-600">
        Cette page est réservée au personnel de l’établissement.
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-xl font-black text-slate-900">Documents reçus via le chat</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fichiers échangés dans les conversations de votre établissement (messagerie interne).
      </p>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      )}
      {err && <p className="mt-6 text-sm text-red-600">{err}</p>}

      {!loading && !err && docs.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
          Aucun document pour le moment.
        </p>
      )}

      {!loading && docs.length > 0 && (
        <ul className="mt-6 space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{d.attachment_name || 'Fichier'}</p>
                <p className="text-xs text-slate-500">
                  {d.sender ? `${d.sender.prenom} ${d.sender.nom}` : '—'} ·{' '}
                  {d.created_at ? new Date(d.created_at).toLocaleString('fr-FR') : ''}
                </p>
                {d.body && d.body !== d.attachment_name && (
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{d.body}</p>
                )}
              </div>
              {d.attachment_url && (
                <a
                  href={mediaUrl(d.attachment_url) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white hover:bg-teal-700"
                >
                  Télécharger
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
