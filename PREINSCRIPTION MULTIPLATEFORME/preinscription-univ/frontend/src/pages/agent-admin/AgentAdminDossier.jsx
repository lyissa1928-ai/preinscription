import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import StatutBadge from '../../components/StatutBadge'
import { DOC_FIELD_LABELS } from '../../utils/preinscriptionDocumentRules'

const DOCS_LABELS = {
  ...DOC_FIELD_LABELS,
  identite_ou_passeport: 'Pièce d’identité ou passeport (au moins une des options ci-dessous)',
}

export default function AgentAdminDossier() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ statut_admin: '', remarque_admin: '' })

  useEffect(() => {
    axios.get(`/api/agent-admin/dossiers/${id}`)
      .then(({ data }) => {
        setData(data)
        setForm({
          statut_admin: data.dossier.statut_admin || '',
          remarque_admin: data.dossier.remarque_admin || ''
        })
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!form.statut_admin) return toast.error('Sélectionnez un statut administratif.')
    setSaving(true)
    try {
      await axios.put(`/api/agent-admin/dossiers/${id}/completude`, form)
      toast.success('Évaluation enregistrée.')
      setData(prev => ({ ...prev, dossier: { ...prev.dossier, statut_admin: form.statut_admin, remarque_admin: form.remarque_admin } }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent"></div>
    </div>
  )

  if (!data) return null
  const { dossier, formation, docs_manquants } = data
  const documents = Array.isArray(data.documents) ? data.documents : []
  const docs_requis = Array.isArray(data.docs_requis) ? data.docs_requis : []

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 w-full">

        <div className="flex items-center gap-4 mb-6">
          <Link to="/agent-admin" className="btn-secondary text-sm">← Retour</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dossier {dossier.numero_dossier}</h1>
            <p className="text-gray-500 text-sm">Contrôle de complétude administrative</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Informations candidat */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">👤</span>
                Informations du candidat
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  ['Prénom', dossier.prenom],
                  ['Nom', dossier.nom],
                  ['Email', dossier.email],
                  ['Statut pédagogique', <StatutBadge statut={dossier.statut} />],
                  ['Date de soumission', new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })],
                  ['Année académique', dossier.annee_academique]
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">{l}</p>
                    <div className="font-medium text-gray-800">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formation */}
            {formation && (
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-sm">🎓</span>
                  Formation
                </h2>
                <p className="font-bold text-gray-900">{formation.titre}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {dossier.type_formation === 'en_ligne' ? '🌐 Formation à distance (FAD)' : `🏫 Présentiel · ${formation.ville}`}
                </p>
              </div>
            )}

            {/* Documents */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-sm">📎</span>
                Documents fournis
                <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${(docs_manquants?.length || 0) === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {(docs_manquants?.length || 0) === 0 ? 'Complet' : `${docs_manquants.length} manquant(s)`} · {documents.length} fichier(s)
                </span>
              </h2>

              <div className="space-y-2">
                {docs_requis.map(type => {
                  const doc = documents.find(d => d.type_document === type)
                  return (
                    <div key={type} className={`flex items-center gap-3 p-3 rounded-xl border ${doc ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <span className={`text-lg ${doc ? 'text-emerald-500' : 'text-red-400'}`}>{doc ? '✅' : '❌'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700">{DOCS_LABELS[type] || type}</p>
                        {doc && <p className="text-xs text-gray-400 truncate">{doc.nom_fichier}</p>}
                        {!doc && <p className="text-xs text-red-500">Document manquant</p>}
                      </div>
                      {doc && (
                        <a href={`/uploads/${doc.chemin}`} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex-shrink-0">Voir</a>
                      )}
                    </div>
                  )
                })}
              </div>

              {docs_manquants?.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-bold text-red-700 mb-1">⚠️ Documents manquants :</p>
                  <p className="text-sm text-red-600">{docs_manquants.map(t => DOCS_LABELS[t] || t).join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Évaluation administrative */}
          <div className="space-y-4">
            <div className="card sticky top-4">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-sm">📋</span>
                Évaluation administrative
              </h2>

              <div className="space-y-3 mb-4">
                {[
                  { val: 'complet', label: '✅ Dossier complet', color: 'border-emerald-500 bg-emerald-50' },
                  { val: 'incomplet', label: '⚠️ Dossier incomplet', color: 'border-red-500 bg-red-50' },
                  { val: 'en_verification', label: '🔍 En vérification', color: 'border-blue-500 bg-blue-50' }
                ].map(({ val, label, color }) => (
                  <label key={val} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.statut_admin === val ? color : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="statut_admin" value={val}
                      checked={form.statut_admin === val}
                      onChange={e => setForm(p => ({ ...p, statut_admin: e.target.value }))}
                      className="sr-only" />
                    <span className="font-semibold text-sm text-gray-800">{label}</span>
                  </label>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarque <span className="font-normal text-gray-400">(optionnel)</span></label>
                <textarea className="input-field" rows={3}
                  placeholder="Ex: Photo floue, diplôme non certifié..."
                  value={form.remarque_admin}
                  onChange={e => setForm(p => ({ ...p, remarque_admin: e.target.value }))} />
              </div>

              <button onClick={handleSave} disabled={saving || !form.statut_admin}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
                {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Enregistrement...</> : '💾 Enregistrer l\'évaluation'}
              </button>

              {dossier.statut_admin && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  Dernière évaluation : {dossier.verifie_le ? new Date(dossier.verifie_le).toLocaleDateString('fr-FR') : '—'}
                </div>
              )}
            </div>
          </div>
        </div>
    </main>
  )
}
