import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { mediaUrl } from '../../utils/mediaUrl'

const fmt = n => new Intl.NumberFormat('fr-FR').format(n || 0)

function justifUrl(rel) {
  if (!rel) return '#'
  const p = String(rel).replace(/^\//, '')
  return mediaUrl(`/uploads/${p}`)
}

export default function ResponsableDemandesProforma() {
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [motifRefus, setMotifRefus] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    axios.get('/api/responsable/demandes-proforma?limit=200')
      .then(({ data }) => setDemandes(data.demandes || []))
      .catch(() => toast.error('Chargement impossible'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const marquerVue = (id) => {
    axios.put(`/api/responsable/demandes-proforma/${id}/statut`, { statut: 'vue' })
      .then(() => setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: 'vue' } : d)))
      .catch(() => {})
  }

  const ouvrirDecision = (d, type) => {
    setMotifRefus('')
    setModal({ demande: d, type })
  }

  const confirmerDecision = async () => {
    if (!modal) return
    const { demande, type } = modal
    if (type === 'refuser' && !motifRefus.trim()) {
      toast.error('Indiquez un motif de refus')
      return
    }
    setSaving(true)
    try {
      await axios.put(`/api/responsable/demandes-proforma/${demande.id}/decision`, {
        decision: type === 'accepter' ? 'accepter' : 'refuser',
        motif_refus: type === 'refuser' ? motifRefus.trim() : undefined
      })
      toast.success(type === 'accepter' ? 'Demande acceptée — facture proforma et attestation disponibles pour le demandeur.' : 'Demande refusée.')
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <Link to="/mon-etablissement" className="text-sm text-gray-500 hover:text-blue-700">← Mon établissement</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Demandes de préinscription (proforma)</h1>
          <p className="text-gray-500 text-sm mt-1">
            Uniquement les demandes de votre établissement. Le candidat ne reçoit la facture proforma et
            l’attestation de préinscription qu’après votre <strong>acceptation</strong> (ou celle d’un administrateur).
          </p>
        </div>
        <Link to="/responsable" className="btn-secondary text-sm">Dossiers complets →</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" /></div>
      ) : demandes.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🧾</div>
          <p>Aucune demande pour cet établissement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demandes.map(d => (
            <div
              key={d.id}
              className={`card p-4 border ${d.statut === 'nouvelle' || d.statut === 'en_attente' ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100'}`}
              onClick={() => (d.statut === 'nouvelle' || d.statut === 'en_attente') && marquerVue(d.id)}
              role="presentation"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{d.prenom} {d.nom}</span>
                    {(d.statut === 'nouvelle' || d.statut === 'en_attente') && (
                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">NOUVEAU</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d.type_formation === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {d.type_formation === 'en_ligne' ? 'FAD' : 'Présentiel'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1">{d.formation_titre}</p>
                  <p className="text-xs text-gray-500 mt-1">📧 {d.email} · 📞 {d.telephone}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{d.reference} · {new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                  {d.justificatifs && (
                    <div className="flex flex-wrap gap-2 mt-2 text-xs" onClick={e => e.stopPropagation()}>
                      <a href={justifUrl(d.justificatifs.diplome)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">Diplôme</a>
                      <span className="text-gray-300">|</span>
                      <a href={justifUrl(d.justificatifs.releve)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">Relevé</a>
                      <span className="text-gray-300">|</span>
                      <a href={justifUrl(d.justificatifs.formation)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">Formation</a>
                    </div>
                  )}
                  {d.facture?.montant_ttc != null && (
                    <p className="text-sm font-semibold text-blue-700 mt-2">{fmt(d.facture.montant_ttc)} FCFA</p>
                  )}
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full self-start sm:self-end ${
                    d.statut === 'acceptee' ? 'bg-emerald-100 text-emerald-800'
                    : d.statut === 'refusee' ? 'bg-red-100 text-red-700'
                    : d.statut === 'nouvelle' || d.statut === 'en_attente' ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                    {d.statut === 'acceptee' ? 'Acceptée' : d.statut === 'refusee' ? 'Refusée' : d.statut === 'en_attente' ? 'En attente' : d.statut === 'nouvelle' ? 'Nouvelle' : d.statut === 'vue' ? 'Vue' : d.statut}
                  </span>
                  {d.statut !== 'acceptee' && d.statut !== 'refusee' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); ouvrirDecision(d, 'accepter') }}
                        className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700"
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); ouvrirDecision(d, 'refuser') }}
                        className="text-xs font-bold border border-red-300 text-red-700 px-3 py-2 rounded-lg hover:bg-red-50"
                      >
                        Refuser
                      </button>
                    </div>
                  )}
                  {d.statut === 'acceptee' && d.reference && (
                    <Link
                      to={`/facture-publique/${d.reference}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      Voir facture →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-lg text-gray-900">
              {modal.type === 'accepter' ? 'Accepter la demande ?' : 'Refuser la demande ?'}
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              {modal.demande.prenom} {modal.demande.nom} — {modal.demande.formation_titre}
            </p>
            {modal.type === 'accepter' && (
              <p className="text-xs text-emerald-700 mt-3 bg-emerald-50 rounded-lg p-3">
                La facture proforma et l&apos;attestation seront disponibles sur l&apos;espace du candidat après validation.
              </p>
            )}
            {modal.type === 'refuser' && (
              <textarea
                className="input-field mt-4 w-full"
                rows={3}
                placeholder="Motif du refus *"
                value={motifRefus}
                onChange={e => setMotifRefus(e.target.value)}
              />
            )}
            <div className="flex gap-3 mt-6">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)} disabled={saving}>Annuler</button>
              <button
                type="button"
                className={`flex-1 font-semibold py-2.5 rounded-xl text-white ${modal.type === 'accepter' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={confirmerDecision}
                disabled={saving}
              >
                {saving ? '…' : modal.type === 'accepter' ? 'Confirmer' : 'Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
