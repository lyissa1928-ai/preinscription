import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { mediaUrl } from '../../utils/mediaUrl'
import { useAuth } from '../../context/AuthContext'

/**
 * @param {{ etabOnly?: boolean }} props
 */
export default function AdminRapportsHebdo({ etabOnly = false }) {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const canGenerate = user?.role === 'admin' || user?.role === 'directeur'

  const load = useCallback(() => {
    setLoading(true)
    const req =
      etabOnly && user?.etablissement_id
        ? axios.get(`/api/etablissements/${user.etablissement_id}/rapports-hebdomadaires`)
        : axios.get('/api/admin/rapports-hebdomadaires')
    req
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.response?.data?.message || 'Impossible de charger les rapports.'))
      .finally(() => setLoading(false))
  }, [etabOnly, user?.etablissement_id])

  useEffect(() => { load() }, [load])

  const generer = async () => {
    if (!canGenerate) return
    setGenerating(true)
    try {
      const { data } = await axios.post('/api/admin/rapports-hebdomadaires/generer')
      const n = data?.files?.length || 0
      const errN = data?.errors?.length || 0
      toast.success(`Génération terminée : ${n} fichier(s)${errN ? `, ${errN} erreur(s)` : ''}.`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Échec de la génération.')
    } finally {
      setGenerating(false)
    }
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {etabOnly ? 'Rapports hebdomadaires (mon établissement)' : 'Rapports hebdomadaires'}
          </h1>
          <p className="text-sm text-gray-500">
            {etabOnly
              ? 'Activité du staff de votre établissement — PDF et Excel (génération automatique chaque lundi).'
              : 'Fichiers Excel et PDF par établissement + comparaison Directeur — période glissante d’une semaine.'}
          </p>
        </div>
        {canGenerate && !etabOnly && (
          <button type="button" onClick={generer} disabled={generating} className="btn-primary disabled:opacity-50">
            {generating ? 'Génération…' : 'Générer maintenant'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
            Aucun rapport généré pour le moment.
          </div>
        ) : (
          list.map((batch, idx) => (
            <div key={batch.generated_at || idx} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">
                  Généré le {fmtDate(batch.generated_at)}
                </p>
                <p className="text-xs text-gray-500">
                  Période : {fmtDate(batch.period_start)} → {fmtDate(batch.period_end)}
                </p>
              </div>
              {batch.directeur_compare && !etabOnly && (
                <div className="mb-3 flex flex-wrap gap-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-indigo-900">Comparaison Directeur</span>
                  {batch.directeur_compare.url && (
                    <a href={mediaUrl(batch.directeur_compare.url)} className="font-semibold text-indigo-700 hover:underline" target="_blank" rel="noreferrer">
                      Excel
                    </a>
                  )}
                  {batch.directeur_compare.pdf_url && (
                    <a href={mediaUrl(batch.directeur_compare.pdf_url)} className="font-semibold text-indigo-700 hover:underline" target="_blank" rel="noreferrer">
                      PDF
                    </a>
                  )}
                </div>
              )}
              {(batch.files || []).length === 0 ? (
                <p className="text-sm text-gray-500">Aucun fichier dans ce lot.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(batch.files || []).map((f) => (
                    <li key={f.filename || f.url} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{f.etablissement_nom || f.filename}</p>
                        <p className="text-xs text-gray-500">
                          {f.filename}
                          {f.most_active ? ` · Plus actif : ${f.most_active}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {f.url ? (
                          <a
                            href={mediaUrl(f.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-700 hover:underline"
                          >
                            Excel
                          </a>
                        ) : null}
                        {f.pdf_url ? (
                          <a
                            href={mediaUrl(f.pdf_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-700 hover:underline"
                          >
                            PDF
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {(batch.errors || []).length > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  {batch.errors.length} erreur(s) lors de cette génération.
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
