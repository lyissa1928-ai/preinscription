import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const fmt     = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const STATUTS = [
  { val: 'nouvelle',    label: 'Nouvelle',    color: 'bg-blue-100 text-blue-700' },
  { val: 'vue',         label: 'Vue',         color: 'bg-gray-100 text-gray-600' },
  { val: 'en_cours',    label: 'En cours',    color: 'bg-yellow-100 text-yellow-700' },
  { val: 'convertie',   label: 'Convertie',   color: 'bg-green-100 text-green-700' },
  { val: 'annulee',     label: 'Annulée',     color: 'bg-red-100 text-red-600' },
]

const PAYEUR_LABELS = {
  etudiant:     'Étudiant',
  tuteur:       'Tuteur',
  organisation: 'Organisme',
}

function StatutBadge({ statut }) {
  const s = STATUTS.find(x => x.val === statut) || { label: statut, color: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
}

// ─── Modale détail ────────────────────────────────────────────────────────────
function ModalDetail({ demande, onClose, onStatutChange }) {
  const [statut, setStatut] = useState(demande.statut)
  const [saving, setSaving] = useState(false)
  const es  = demande.etablissement_snapshot || {}
  const fac = demande.facture || {}

  const saveStatut = async () => {
    if (statut === demande.statut) { onClose(); return }
    setSaving(true)
    try {
      await axios.put(`/api/admin/demandes-proforma/${demande.id}/statut`, { statut })
      toast.success('Statut mis à jour.')
      onStatutChange(demande.id, statut)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Demande proforma</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{demande.reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">

          {/* Établissement */}
          {es.nom && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
              {es.logo_url
                ? <img src={es.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain border border-gray-200 bg-white" />
                : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg"
                    style={{ background: es.couleur_primaire || '#1e40af' }}>{es.nom[0]}</div>
              }
              <div>
                <p className="font-bold text-blue-800 text-sm">{es.nom}</p>
                {es.adresse && <p className="text-xs text-blue-600">{es.adresse}</p>}
              </div>
            </div>
          )}

          {/* Étudiant + Payeur */}
          <div className={`grid gap-4 ${demande.type_payeur !== 'etudiant' && demande.payeur ? 'sm:grid-cols-2' : ''}`}>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Étudiant</p>
              <p className="font-bold text-gray-800">{demande.prenom} {demande.nom?.toUpperCase()}</p>
              <p className="text-sm text-gray-600">{demande.email}</p>
              <p className="text-sm text-gray-600">Tél : {demande.telephone}</p>
              {demande.niveau && <p className="text-sm text-gray-500 mt-1">Niveau : {demande.niveau}</p>}
            </div>

            {demande.type_payeur !== 'etudiant' && demande.payeur && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {demande.type_payeur === 'tuteur' ? 'Tuteur / Payeur' : 'Organisme Payeur'}
                </p>
                {demande.type_payeur === 'tuteur' ? (
                  <>
                    <p className="font-bold text-gray-800">{demande.payeur.prenom} {demande.payeur.nom?.toUpperCase()}</p>
                    {demande.payeur.relation  && <p className="text-sm text-gray-600">Lien : {demande.payeur.relation}</p>}
                    {demande.payeur.telephone && <p className="text-sm text-gray-600">Tél : {demande.payeur.telephone}</p>}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-800">{demande.payeur.org_nom}</p>
                    {demande.payeur.ninea   && <p className="text-sm text-gray-600">NINEA : {demande.payeur.ninea}</p>}
                    {demande.payeur.contact && <p className="text-sm text-gray-600">Contact : {demande.payeur.contact}</p>}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Formation */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Formation</p>
            <p className="font-bold text-gray-800">{demande.formation_titre}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {demande.type_formation === 'en_ligne' ? 'En ligne (FAD)' : 'Présentiel'}
              </span>
              {demande.formation_ville && <span>📍 {demande.formation_ville}</span>}
              {demande.formation_niveau_requis && <span>🎓 Niveau requis : {demande.formation_niveau_requis}</span>}
            </div>
          </div>

          {/* Facture */}
          {fac.numero && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Facture proforma</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Désignation</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(fac.lignes || []).map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-700">{l.designation}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{fmt(l.montant)} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200">
                    <tr className="bg-blue-700 text-white">
                      <td className="px-4 py-3 font-bold">TOTAL TTC</td>
                      <td className="px-4 py-3 text-right font-black text-lg tabular-nums">{fmt(fac.montant_ttc)} FCFA</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>N° {fac.numero}</span>
                {fac.validite_jusqu_au && <span>Valable jusqu'au {fmtDate(fac.validite_jusqu_au)}</span>}
              </div>
            </div>
          )}

          {/* Changer statut */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Changer le statut</p>
            <div className="flex flex-wrap gap-2">
              {STATUTS.map(s => (
                <button key={s.val} onClick={() => setStatut(s.val)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all
                    ${statut === s.val
                      ? 'border-blue-600 bg-blue-600 text-white shadow'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <a href={`/facture-publique/${demande.reference}`} target="_blank" rel="noreferrer"
              className="btn-secondary flex-1 text-center text-sm">
              Voir la facture →
            </a>
            <button onClick={saveStatut} disabled={saving}
              className="btn-primary flex-1 text-sm disabled:opacity-50">
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminProforma() {
  const [demandes,  setDemandes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filtre,    setFiltre]    = useState('')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)

  const load = () => {
    setLoading(true)
    axios.get('/api/admin/demandes-proforma')
      .then(({ data }) => setDemandes(data))
      .catch(() => toast.error('Erreur de chargement.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleStatutChange = (id, newStatut) => {
    setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: newStatut } : d))
  }

  const filtered = demandes.filter(d => {
    const matchStatut = !filtre || d.statut === filtre
    const s = search.toLowerCase()
    const matchSearch = !s ||
      (d.nom || '').toLowerCase().includes(s) ||
      (d.prenom || '').toLowerCase().includes(s) ||
      (d.email || '').toLowerCase().includes(s) ||
      (d.reference || '').toLowerCase().includes(s) ||
      (d.formation_titre || '').toLowerCase().includes(s)
    return matchStatut && matchSearch
  })

  const countByStatut = (val) => demandes.filter(d => d.statut === val).length

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 w-full">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <Link to="/admin" className="text-sm text-gray-400 hover:text-blue-700">← Administration</Link>
          <h1 className="text-3xl font-bold text-gray-800 mt-1">Demandes Proforma</h1>
          <p className="text-gray-500 mt-1">Préinscriptions soumises via le formulaire public</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-purple-700">{demandes.length}</p>
          <p className="text-xs text-gray-400">demande(s) au total</p>
        </div>
      </div>

      {/* Compteurs par statut */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFiltre('')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all
            ${filtre === '' ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
          Tous ({demandes.length})
        </button>
        {STATUTS.map(s => (
          <button key={s.val} onClick={() => setFiltre(s.val)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all
              ${filtre === s.val ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
            {s.label} ({countByStatut(s.val)})
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative mb-5 max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="input-field pl-9"
          placeholder="Rechercher par nom, email, référence, formation…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3 opacity-30">📋</div>
          <p className="text-gray-500">Aucune demande trouvée.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Référence', 'Étudiant', 'Formation', 'Montant TTC', 'Payeur', 'Date', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-purple-50 transition-colors cursor-pointer"
                    onClick={() => setSelected(d)}>
                    <td className="px-4 py-3 font-mono text-xs text-purple-700 font-bold whitespace-nowrap">{d.reference}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 whitespace-nowrap">{d.prenom} {d.nom?.toUpperCase()}</p>
                      <p className="text-xs text-gray-500">{d.email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-700 truncate">{d.formation_titre}</p>
                      <p className="text-xs text-gray-400">
                        {d.type_formation === 'en_ligne' ? 'En ligne' : 'Présentiel'}
                        {d.formation_ville ? ` · ${d.formation_ville}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800 tabular-nums whitespace-nowrap">
                      {d.facture ? fmt(d.facture.montant_ttc) + ' FCFA' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${d.type_payeur === 'tuteur' ? 'bg-green-100 text-green-700' :
                          d.type_payeur === 'organisation' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {PAYEUR_LABELS[d.type_payeur] || 'Étudiant'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(d.created_at)}</td>
                    <td className="px-4 py-3"><StatutBadge statut={d.statut} /></td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setSelected(d) }}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold border border-purple-200 hover:border-purple-400 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                        Détail →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modale */}
      {selected && (
        <ModalDetail
          demande={selected}
          onClose={() => setSelected(null)}
          onStatutChange={handleStatutChange}
        />
      )}
    </main>
  )
}
