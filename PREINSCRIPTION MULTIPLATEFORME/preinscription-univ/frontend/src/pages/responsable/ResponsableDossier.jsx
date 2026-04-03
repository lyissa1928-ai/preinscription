import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import StatutBadge from '../../components/StatutBadge'
import PreinscriptionConditionsBlock from '../../components/PreinscriptionConditionsBlock'
import { isDossierAcceptePourDocuments } from '../../utils/dossierStatut'
import { mediaUrl } from '../../utils/mediaUrl'

const ALLOWED_TRANSITIONS = {
  en_attente: ['en_attente', 'en_cours', 'refuse', 'accepte'],
  en_cours: ['en_cours', 'accepte', 'refuse'],
  accepte: ['accepte'],
  refuse: ['refuse', 'en_cours'],
}

export default function ResponsableDossier() {
  const { id } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [decision, setDecision] = useState({ statut: '', motif_rejet: '' })

  useEffect(() => {
    axios.get(`/api/responsable/dossiers/${id}`)
      .then(({ data }) => {
        setData(data)
        setDecision(prev => ({ ...prev, statut: data.dossier.statut }))
      })
      .catch(() => toast.error('Dossier introuvable'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDecision = async () => {
    if (!decision.statut) return toast.error('Choisissez un statut')
    const current = data?.dossier?.statut || 'en_attente'
    const allowed = ALLOWED_TRANSITIONS[current] || ['en_attente']
    if (!allowed.includes(decision.statut)) {
      return toast.error(`Transition non autorisée: ${current} -> ${decision.statut}`)
    }
    if (decision.statut === 'refuse' && !String(decision.motif_rejet || '').trim()) {
      return toast.error('Le motif de rejet est obligatoire.')
    }
    setSaving(true)
    try {
      const { data: res } = await axios.put(`/api/responsable/dossiers/${id}/statut`, decision)
      toast.success(res.message)
      setData((prev) => ({
        ...prev,
        dossier: {
          ...prev.dossier,
          statut: decision.statut,
          commentaire_admin: decision.statut === 'refuse' ? decision.motif_rejet : prev.dossier.commentaire_admin,
          lettre_generee: decision.statut === 'accepte',
        },
      }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent"></div>
    </div>
  )
  if (!data) return null

  const { dossier, documents: docsRaw, formation } = data
  const documents = Array.isArray(docsRaw) ? docsRaw : []
  const photoDoc = documents?.find(d => d.type_document === 'photo')
  const allowedTransitions = ALLOWED_TRANSITIONS[dossier.statut || 'en_attente'] || ['en_attente']

  const isAccepte = isDossierAcceptePourDocuments(dossier.statut)

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 w-full">

        {/* En-tête */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/responsable" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-gray-300 transition-colors">
            ← Retour
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Dossier {dossier.numero_dossier}</h1>
              <StatutBadge statut={dossier.statut} />
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${dossier.type_formation === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {dossier.type_formation === 'en_ligne' ? '🌐 FAD' : '🏫 Présentiel'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Déposé le {new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-5">

            {/* Photo + identité */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">👤 Candidat</h2>
              <div className="flex items-start gap-5">
                {photoDoc ? (
                  <img
                    src={mediaUrl(`/uploads/${photoDoc.chemin}`)}
                    alt="Photo candidat"
                    className="w-24 h-28 object-cover rounded-xl border-2 border-gray-200 flex-shrink-0 shadow"
                    onError={e => { e.target.style.display='none' }}
                  />
                ) : (
                  <div className="w-24 h-28 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-3xl">👤</span>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3 flex-1 text-sm">
                  {[
                    ['Nom complet', `${dossier.prenom} ${dossier.nom}`],
                    ['Email', dossier.email],
                    ['Téléphone', dossier.telephone],
                    ['Nationalité', dossier.nationalite],
                    ['Date de naissance', new Date(dossier.date_naissance).toLocaleDateString('fr-FR')],
                    ['Lieu de naissance', dossier.lieu_naissance],
                    ['Adresse', dossier.adresse],
                  ].map(([l, v]) => (
                    <div key={l}><span className="text-xs text-gray-400 uppercase tracking-wide">{l}</span><p className="font-semibold text-gray-800 mt-0.5">{v}</p></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Formation */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">🎓 Formation demandée</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['Formation', dossier.filiere],
                  ['Type', dossier.type_formation === 'en_ligne' ? '🌐 FAD (En ligne)' : '🏫 Présentiel'],
                  ['Année académique', dossier.annee_academique],
                  ['Niveau requis (diplôme)', dossier.niveau],
                  ['Niveau de formation', dossier.formation_niveau_cible || formation?.niveau || '—'],
                  ['Dernier diplôme', dossier.dernier_diplome],
                  ['Établissement', dossier.etablissement_origine],
                  ['Mention', dossier.mention || 'Non renseignée'],
                  ['Année d\'obtention', dossier.annee_obtention],
                ].map(([l, v]) => (
                  <div key={l}><span className="text-xs text-gray-400 uppercase tracking-wide">{l}</span><p className="font-semibold text-gray-800 mt-0.5">{v}</p></div>
                ))}
              </div>
              {formation && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-500">Frais totaux :</div>
                  <div className="font-bold text-blue-700">{new Intl.NumberFormat('fr-FR').format(formation.prix || 0)} FCFA</div>
                  <p className="text-[10px] text-gray-500 mt-0.5">Forfait annuel (inscription + mensualités × durée)</p>
                </div>
              )}
              <div className="mt-4">
                <PreinscriptionConditionsBlock
                  formationNiveau={dossier.formation_niveau_cible || formation?.niveau}
                  profileKey={dossier.document_rule_profile}
                />
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">📎 Documents soumis</h2>
              {documents.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun document soumis</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {documents.map(doc => (
                    <a key={doc.id} href={mediaUrl(`/uploads/${doc.chemin}`)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                      <div className="w-9 h-9 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-lg flex-shrink-0">
                        {doc.type_document === 'photo' ? '🖼️' : '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{doc.type_document.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-700 truncate font-medium">{doc.nom_fichier}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne décision */}
          <div className="space-y-5">

            {/* Décision */}
            <div className="card sticky top-4">
              <h2 className="font-bold text-gray-900 mb-4">⚖️ Décision pédagogique</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setDecision(p => ({ ...p, statut: 'en_cours' }))}
                    disabled={!allowedTransitions.includes('en_cours')}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${decision.statut === 'en_cours' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                    🔍 En cours
                  </button>
                  <button onClick={() => setDecision(p => ({ ...p, statut: 'en_attente' }))}
                    disabled={!allowedTransitions.includes('en_attente')}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${decision.statut === 'en_attente' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-amber-300'}`}>
                    ⏳ En attente
                  </button>
                  <button onClick={() => setDecision(p => ({ ...p, statut: 'accepte' }))}
                    disabled={!allowedTransitions.includes('accepte')}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${decision.statut === 'accepte' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-emerald-400'}`}>
                    ✅ Accepter
                  </button>
                  <button onClick={() => setDecision(p => ({ ...p, statut: 'refuse' }))}
                    disabled={!allowedTransitions.includes('refuse')}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${decision.statut === 'refuse' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-400'}`}>
                    ❌ Refuser
                  </button>
                </div>

                {decision.statut === 'refuse' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Motif de rejet <span className="text-red-500">*</span></label>
                    <textarea className="input-field" rows={3}
                      placeholder="Expliquez le motif du rejet au candidat..."
                      value={decision.motif_rejet}
                      onChange={e => setDecision(p => ({ ...p, motif_rejet: e.target.value }))} />
                  </div>
                )}

                {decision.statut === 'accepte' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-sm text-emerald-800">
                    <p className="font-semibold mb-1">✅ Acceptation automatique</p>
                    <p className="text-xs">La lettre de préinscription sera générée automatiquement et disponible au téléchargement.</p>
                  </div>
                )}

                <button onClick={handleDecision} disabled={saving || !decision.statut}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Enregistrement...</> : '💾 Enregistrer la décision'}
                </button>
              </div>
            </div>

            {/* Lettre préinscription */}
            {isAccepte && (
              <div className="card border-emerald-200 bg-emerald-50">
                <h2 className="font-bold text-emerald-900 mb-3">📜 Documents officiels</h2>
                <p className="text-sm text-emerald-700 mb-4">Préinscription acceptée : lettre et attestation disponibles.</p>
                <div className="flex flex-col gap-2">
                  <Link to={`/lettre/${id}`} target="_blank"
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm w-full">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Lettre de préinscription
                  </Link>
                  <Link to={`/attestation/${id}`} target="_blank"
                    className="flex items-center justify-center gap-2 border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm w-full">
                    Attestation de préinscription
                  </Link>
                </div>
              </div>
            )}

            {/* Commentaire existant */}
            {dossier.commentaire_admin && (
              <div className="card border-gray-200">
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Dernier commentaire</p>
                <p className="text-sm text-gray-700">{dossier.commentaire_admin}</p>
              </div>
            )}
          </div>
        </div>
    </main>
  )
}
