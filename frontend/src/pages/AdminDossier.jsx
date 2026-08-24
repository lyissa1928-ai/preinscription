import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import StatutBadge from '../components/StatutBadge'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import { isDossierAcceptePourDocuments } from '../utils/dossierStatut'
import { mediaUrl } from '../utils/mediaUrl'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)
const ALLOWED_TRANSITIONS = {
  en_attente: ['en_attente', 'en_cours', 'refuse', 'accepte'],
  en_cours: ['en_cours', 'accepte', 'refuse'],
  accepte: ['accepte'],
  refuse: ['refuse', 'en_cours'],
}

export default function AdminDossier() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dossier, setDossier] = useState(null)
  const [documents, setDocuments] = useState([])
  const [facture, setFacture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [genFacture, setGenFacture] = useState(false)
  const [statut, setStatut] = useState('')
  const [commentaire, setCommentaire] = useState('')

  useEffect(() => {
    axios.get(`/api/admin/dossiers/${id}`)
      .then(({ data }) => {
        setDossier(data.dossier)
        setDocuments(Array.isArray(data.documents) ? data.documents : [])
        setStatut(data.dossier.statut); setCommentaire(data.dossier.commentaire_admin || '')
      })
      .catch(() => toast.error('Dossier introuvable'))
      .finally(() => setLoading(false))

    axios.get(`/api/factures/dossier/${id}`).then(({ data }) => setFacture(data)).catch(() => {})
  }, [id])

  const handleUpdateStatut = async () => {
    const current = dossier?.statut || 'en_attente'
    const allowed = ALLOWED_TRANSITIONS[current] || ['en_attente']
    if (!allowed.includes(statut)) {
      toast.error(`Transition non autorisée: ${current} -> ${statut}`)
      return
    }
    if (statut === 'refuse' && !String(commentaire || '').trim()) {
      toast.error('Le motif de refus est obligatoire.')
      return
    }
    setSaving(true)
    try {
      await axios.put(`/api/admin/dossiers/${id}/statut`, { statut, commentaire })
      toast.success('Statut mis à jour')
      setDossier(prev => ({ ...prev, statut, commentaire_admin: commentaire }))
    } catch { toast.error('Erreur lors de la mise à jour') }
    finally { setSaving(false) }
  }

  const handleGenererFacture = async () => {
    setGenFacture(true)
    try {
      const { data } = await axios.post(`/api/factures/generer/${id}`)
      setFacture(data); toast.success('Facture générée !')
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur génération facture') }
    finally { setGenFacture(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent"></div></div>

  if (!dossier) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Dossier introuvable</p></div>
  const allowedTransitions = ALLOWED_TRANSITIONS[dossier.statut || 'en_attente'] || ['en_attente']

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-gray-300 transition-colors">
            ← Retour
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dossier {dossier.numero_dossier}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatutBadge statut={dossier.statut} />
              <span className="text-sm text-gray-400">Déposé le {new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Étudiant */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">👤 Informations personnelles</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  ['Nom complet', `${dossier.prenom} ${dossier.nom}`],
                  ['Matricule (compte)', dossier.matricule ? <span className="font-mono">{dossier.matricule}</span> : '—'],
                  ['Email', dossier.email], ['Téléphone', dossier.telephone],
                  ['Nationalité', dossier.nationalite],
                  ['Date de naissance', new Date(dossier.date_naissance).toLocaleDateString('fr-FR')],
                  ['Lieu de naissance', dossier.lieu_naissance],
                  ['Adresse', dossier.adresse],
                ].map(([label, value]) => (
                  <div key={label}><span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span><p className="font-semibold text-gray-800 mt-0.5">{value}</p></div>
                ))}
              </div>
            </div>

            {/* Formation */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">🎓 Formation demandée</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  ['Formation', dossier.filiere],
                  ['Type', dossier.type_formation === 'en_ligne' ? '🌐 En ligne' : '🏫 Présentiel'],
                  ['Niveau requis (diplôme)', dossier.niveau],
                  ['Niveau de formation', dossier.formation_niveau_cible || '—'],
                  ['Année académique', dossier.annee_academique],
                  ['Dernier diplôme', dossier.dernier_diplome],
                  ['Établissement', dossier.etablissement_origine],
                  ['Mention', dossier.mention || 'Non renseignée'],
                  ['Année d\'obtention', dossier.annee_obtention],
                ].map(([label, value]) => (
                  <div key={label}><span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span><p className="font-semibold text-gray-800 mt-0.5">{value}</p></div>
                ))}
              </div>
              <div className="mt-4">
                <PreinscriptionConditionsBlock
                  formationNiveau={dossier.formation_niveau_cible}
                  profileKey={dossier.document_rule_profile}
                />
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">📎 Documents soumis</h2>
              {documents.length === 0 ? <p className="text-gray-400 text-sm">Aucun document</p> : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-lg">📄</div>
                        <div><p className="text-sm font-semibold text-gray-700 capitalize">{doc.type_document.replace('_', ' ')}</p><p className="text-xs text-gray-400">{doc.nom_fichier}</p></div>
                      </div>
                      <a href={mediaUrl(`/uploads/${doc.chemin}`)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-lg transition-colors">
                        Voir
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne action */}
          <div className="space-y-5">
            {/* Décision */}
            <div className="card sticky top-4">
              <h2 className="font-bold text-gray-900 mb-4">⚖️ Décision</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Statut</label>
                  <select className="input-field" value={statut} onChange={e => setStatut(e.target.value)}>
                    {[
                      ['en_attente', '⏳ En attente'],
                      ['en_cours', '🔍 En cours d\'examen'],
                      ['accepte', '✅ Accepté'],
                      ['refuse', '❌ Refusé'],
                    ].map(([value, label]) => (
                      <option key={value} value={value} disabled={!allowedTransitions.includes(value)}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Message à l'étudiant</label>
                  <textarea className="input-field" rows={4} placeholder="Commentaire ou motif de la décision..." value={commentaire} onChange={e => setCommentaire(e.target.value)} />
                  {statut === 'refuse' && <p className="text-xs text-red-600 mt-1">Motif obligatoire pour un refus.</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStatut('accepte')}
                    disabled={!allowedTransitions.includes('accepte')}
                    className="text-sm py-2 px-3 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                  >
                    ✓ Accepter
                  </button>
                  <button
                    onClick={() => setStatut('refuse')}
                    disabled={!allowedTransitions.includes('refuse')}
                    className="text-sm py-2 px-3 rounded-lg bg-red-50 text-red-700 font-semibold border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40"
                  >
                    ✗ Refuser
                  </button>
                </div>
                <button onClick={handleUpdateStatut} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Enregistrement...</> : '💾 Enregistrer la décision'}
                </button>
              </div>
            </div>

            {isDossierAcceptePourDocuments(dossier.statut) && (
              <div className="card border-emerald-200 bg-emerald-50">
                <h2 className="font-bold text-emerald-900 mb-3">📜 Documents officiels</h2>
                <p className="text-sm text-emerald-800 mb-4">
                  Attestation disponible. Lettre réservée aux candidats étrangers acceptés en ligne.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {dossier.source !== 'staff' && (
                    <Link
                      to={`/lettre/${id}`}
                      target="_blank"
                      className="btn-primary text-center text-sm flex-1"
                    >
                      Lettre
                    </Link>
                  )}
                  <Link
                    to={`/attestation/${id}`}
                    target="_blank"
                    className="btn-outline text-center text-sm flex-1 border-indigo-600 text-indigo-700 hover:bg-indigo-50"
                  >
                    Attestation
                  </Link>
                </div>
              </div>
            )}

            {/* Facture proforma */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">🧾 Facture Proforma</h2>
              {facture ? (
                <div>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 mb-3">
                    <p className="text-xs text-emerald-600 font-bold">FACTURE ÉMISE</p>
                    <p className="font-mono text-sm font-bold text-gray-800">{facture.numero}</p>
                    <p className="text-xl font-black text-blue-700 mt-1">{fmt(facture.montant_ttc)} FCFA</p>
                  </div>
                  <Link to={`/facture/${id}`} target="_blank" className="btn-outline w-full text-center block text-sm">
                    Voir la facture →
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">Aucune facture générée pour ce dossier.</p>
                  <button onClick={handleGenererFacture} disabled={genFacture} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                    {genFacture ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Génération...</> : '+ Générer la facture'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
    </main>
  )
}
