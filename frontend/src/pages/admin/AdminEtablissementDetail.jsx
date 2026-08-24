import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import {
  FaUniversity,
  FaBook,
  FaGraduationCap,
  FaCheckCircle,
  FaFileInvoice,
  FaUsers,
  FaUserTie,
  FaSearch,
  FaChevronRight,
  FaPlus,
  FaLayerGroup,
  FaEdit,
  FaTrashAlt,
  FaUndo,
  FaUserCog,
  FaShieldAlt,
  FaExclamationTriangle,
} from 'react-icons/fa'
import { TabFacturesEtab } from './TabFacturesEtab'
import { TabAcceptesParFormation } from './TabAcceptesParFormation'
import PreinscriptionConditionsBlock from '../../components/PreinscriptionConditionsBlock'

const fmt = n => new Intl.NumberFormat('fr-FR').format(n || 0)

/** Forfait annuel = inscription + mensualité × durée (mois). */
function computeScolariteAnnuelle(fi, men, mois) {
  const a = parseInt(String(fi ?? ''), 10) || 0
  const b = parseInt(String(men ?? ''), 10) || 0
  const c = parseInt(String(mois ?? ''), 10) || 0
  return a + b * c
}

function normalizeFraisSuppFromForm(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map((x) => ({
      designation: String(x?.designation || '').trim(),
      montant: parseInt(x?.montant, 10) || 0,
    }))
    .filter((x) => x.designation && x.montant > 0)
}

function parseFraisSuppJson(s) {
  if (s == null || !String(s).trim()) return []
  try {
    const j = JSON.parse(String(s))
    if (!Array.isArray(j)) return []
    return j
      .map((x) => ({
        designation: String(x?.designation || '').trim(),
        montant: parseInt(x?.montant, 10) || 0,
      }))
      .filter((x) => x.designation && x.montant > 0)
  } catch {
    return []
  }
}

/** Validation locale avant envoi du batch (évite un aller-retour API inutile). */
function validateBatchFormationRows(rows) {
  const issues = []
  rows.forEach((r, i) => {
    const line = i + 1
    if (!String(r.titre || '').trim()) {
      issues.push({ index: i, line, message: 'Titre obligatoire.' })
    }
    const fid = parseInt(r.filiere_id, 10)
    if (!r.filiere_id || Number.isNaN(fid)) {
      issues.push({ index: i, line, message: 'Filière obligatoire.' })
    }
    const rawJson = String(r.frais_supplementaires_json ?? '').trim()
    if (rawJson && rawJson !== '[]') {
      try {
        const j = JSON.parse(rawJson)
        if (!Array.isArray(j)) {
          issues.push({ index: i, line, message: 'Frais supplémentaires : un tableau JSON est attendu, ex. [].' })
        } else {
          j.forEach((item, k) => {
            const des = String(item?.designation || '').trim()
            const m = parseInt(item?.montant, 10)
            if (!des || Number.isNaN(m) || m < 0) {
              issues.push({
                index: i,
                line,
                message: `Frais sup. entrée ${k + 1} : désignation et montant ≥ 0 requis.`,
              })
            }
          })
        }
      } catch {
        issues.push({ index: i, line, message: 'JSON des frais supplémentaires invalide.' })
      }
    }
  })
  return issues
}

const TYPES_ETAB = [
  { val: 'sante',   label: '🏥 Santé' },
  { val: 'btp',     label: '🏗️ BTP / Génie Civil' },
  { val: 'gestion', label: '📊 Commerce / Informatique / Administration' },
]
const ROLES_STAFF = [
  { val: 'responsable', label: 'Responsable pédagogique' },
  { val: 'agent_admin', label: 'Agent administratif' },
  { val: 'comptable', label: 'Comptable' },
  { val: 'controleur_qualite', label: 'Contrôleur qualité' },
]
const ROLE_COLORS = {
  responsable: 'bg-teal-100 text-teal-700', agent_admin: 'bg-orange-100 text-orange-700',
  comptable: 'bg-violet-100 text-violet-700',
  controleur_qualite: 'bg-cyan-100 text-cyan-800',
}

// ─── Helper label ──────────────────────────────────────────────────────────────
const L = ({ children }) => <label className="block text-sm font-semibold text-gray-700 mb-1">{children}</label>

// ═══════════════════════════════════════════════════════════════════════
// Onglet 1 — Identité
// ═══════════════════════════════════════════════════════════════════════
function TabIdentite({ etab, onUpdated }) {
  const [form, setForm] = useState({ ...etab })
  const [logo, setLogo] = useState(null)
  const [cachet, setCachet] = useState(null)
  const [saving, setSaving] = useState(false)

  const up = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      // 1) Enregistrer les champs texte en JSON
      const fields = [
        'nom', 'type', 'description', 'couleur_primaire', 'couleur_secondaire',
        'adresse', 'telephone', 'email_contact', 'site_web',
        'ninea', 'rc', 'arrete', 'compte_bancaire',
        'banque', 'iban', 'swift', 'signataire_nom', 'signataire_fonction'
      ]
      const payload = {}
      fields.forEach(f => { payload[f] = form[f] || '' })
      const { data } = await axios.put(`/api/etablissements/${etab.id}`, payload)

      // 2) Si des fichiers sont sélectionnés, les envoyer séparément
      if (logo || cachet) {
        const fd = new FormData()
        if (logo) fd.append('logo', logo)
        if (cachet) fd.append('cachet', cachet)
        const { data: withFiles } = await axios.post(`/api/etablissements/${etab.id}/upload`, fd)
        toast.success('Informations et fichiers mis à jour.')
        onUpdated(withFiles)
      } else {
        toast.success('Informations mises à jour.')
        onUpdated(data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <L>Nom de l'établissement *</L>
          <input className="input-field" value={form.nom || ''} onChange={up('nom')} required />
        </div>
        <div>
          <L>Type / Secteur</L>
          <select className="input-field" value={form.type || ''} onChange={up('type')}>
            {TYPES_ETAB.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <L>Email de contact</L>
          <input className="input-field" type="email" value={form.email_contact || ''} onChange={up('email_contact')} />
        </div>
        <div>
          <L>Téléphone</L>
          <input className="input-field" value={form.telephone || ''} onChange={up('telephone')} />
        </div>
        <div>
          <L>Site web</L>
          <input className="input-field" value={form.site_web || ''} onChange={up('site_web')} />
        </div>
        <div className="md:col-span-2">
          <L>Adresse</L>
          <input className="input-field" value={form.adresse || ''} onChange={up('adresse')} />
        </div>
        <div>
          <L>NINEA</L>
          <input className="input-field" value={form.ninea || ''} onChange={up('ninea')} placeholder="Ex: 00123456 2Z1" />
        </div>
        <div>
          <L>RC (Registre Commercial)</L>
          <input className="input-field" value={form.rc || ''} onChange={up('rc')} placeholder="Ex: SN-DKR-2024-B-12345" />
        </div>
        <div className="md:col-span-2">
          <L>Arrêté d'autorisation</L>
          <input className="input-field" value={form.arrete || ''} onChange={up('arrete')} placeholder="Ex: Arrêté n°12345/MEN/DLFC du 01/01/2020" />
        </div>
        <div>
          <L>Banque</L>
          <input className="input-field" value={form.banque || ''} onChange={up('banque')} placeholder="Ex: CORIS BANK INTERNATIONAL" />
        </div>
        <div>
          <L>Compte bancaire / IBAN</L>
          <input className="input-field" value={form.compte_bancaire || ''} onChange={up('compte_bancaire')} placeholder="Ex: SN28 0001 0001 0000 0000 0000" />
        </div>
        <div>
          <L>IBAN (détaillé)</L>
          <input className="input-field" value={form.iban || ''} onChange={up('iban')} placeholder="Ex: SN21 3010 0100 278242410163" />
        </div>
        <div>
          <L>Code SWIFT</L>
          <input className="input-field" value={form.swift || ''} onChange={up('swift')} placeholder="Ex: CORISNDA" />
        </div>
        <div>
          <L>Nom du signataire</L>
          <input className="input-field" value={form.signataire_nom || ''} onChange={up('signataire_nom')} placeholder="Ex: Pr. Mamadou DIOP" />
        </div>
        <div>
          <L>Fonction du signataire</L>
          <input className="input-field" value={form.signataire_fonction || ''} onChange={up('signataire_fonction')} placeholder="Ex: Directeur des études" />
        </div>
        <div className="md:col-span-2">
          <L>Description</L>
          <textarea className="input-field" rows={3} value={form.description || ''} onChange={up('description')} />
        </div>
        {/* Couleurs */}
        <div>
          <L>Couleur principale</L>
          <div className="flex items-center gap-3">
            <input type="color" className="w-10 h-10 rounded cursor-pointer border border-gray-200" value={form.couleur_primaire || '#1e40af'} onChange={up('couleur_primaire')} />
            <input className="input-field flex-1" value={form.couleur_primaire || ''} onChange={up('couleur_primaire')} />
          </div>
        </div>
        <div>
          <L>Couleur secondaire</L>
          <div className="flex items-center gap-3">
            <input type="color" className="w-10 h-10 rounded cursor-pointer border border-gray-200" value={form.couleur_secondaire || '#3b82f6'} onChange={up('couleur_secondaire')} />
            <input className="input-field flex-1" value={form.couleur_secondaire || ''} onChange={up('couleur_secondaire')} />
          </div>
        </div>
        {/* Fichiers */}
        <div>
          <L>Logo</L>
          {etab.logo_url && <img src={etab.logo_url} alt="logo" className="w-20 h-20 object-contain border rounded-xl mb-2 p-1 bg-gray-50" />}
          <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={e => setLogo(e.target.files[0])} className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
        </div>
        <div>
          <L>Cachet officiel</L>
          {etab.cachet_url && <img src={etab.cachet_url} alt="cachet" className="w-20 h-20 object-contain border rounded-xl mb-2 p-1 bg-gray-50" />}
          <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => setCachet(e.target.files[0])} className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
        </div>
      </div>

      {/* Aperçu — Lettre officielle (additif, sans sauvegarde) */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-bold text-gray-900">Aperçu · Paramètres “Lettre officielle”</p>
            <p className="text-xs text-gray-500 mt-1">
              Cet aperçu montre comment ces champs apparaissent dans la lettre. Il ne remplace pas l’enregistrement.
            </p>
          </div>
          <div className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1">
            Document officiel · Version 1.0
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Conformité établissement</p>
            <div className="mt-2 space-y-1 text-sm text-gray-800">
              <p>NINEA : <strong>{form.ninea || '—'}</strong></p>
              <p>RC : <strong>{form.rc || '—'}</strong></p>
              <p>Arrêté / agrément : <strong>{form.arrete || '—'}</strong></p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Paiement (si applicable)</p>
            <div className="mt-2 space-y-1 text-sm text-gray-800">
              <p>Banque : <strong>{form.banque || '—'}</strong></p>
              <p>Compte : <strong className="font-mono">{form.compte_bancaire || '—'}</strong></p>
              <p>IBAN : <strong className="font-mono">{form.iban || '—'}</strong></p>
              <p>SWIFT : <strong className="font-mono">{form.swift || '—'}</strong></p>
            </div>
          </div>

          <div className="md:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Signature / validation</p>
            <div className="mt-2 grid md:grid-cols-2 gap-3 text-sm text-gray-800">
              <p>Nom du signataire : <strong>{form.signataire_nom || 'Le Responsable pédagogique'}</strong></p>
              <p>Fonction : <strong>{form.signataire_fonction || 'Pour le Directeur des études'}</strong></p>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Conseil : renseigner le <strong>nom</strong> et la <strong>fonction</strong> pour une lettre plus institutionnelle.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-40">
          {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Enregistrement...</> : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Onglet 2 — Filières
// ═══════════════════════════════════════════════════════════════════════
export function TabFilieres({ etabId, filieres: init, onFiliereChange }) {
  const [filieres, setFilieres] = useState(init || [])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nom: '', code: '', description: '' })
  const [saving, setSaving] = useState(false)

  const up = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const openCreate = () => { setEditing(null); setForm({ nom: '', code: '', description: '' }); setShowForm(true) }
  const openEdit = f => { setEditing(f); setForm({ nom: f.nom, code: f.code || '', description: f.description || '' }); setShowForm(true) }

  const update = (newList) => { setFilieres(newList); onFiliereChange?.(newList) }

  const refreshFilieres = async () => {
    try {
      const { data } = await axios.get(`/api/etablissements/${etabId}/filieres`)
      update(Array.isArray(data) ? data : [])
    } catch {
      // no-op
    }
  }

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { data } = await axios.put(`/api/etablissements/${etabId}/filieres/${editing.id}`, form)
        update(filieres.map(f => f.id === editing.id ? data : f))
        toast.success('Filière modifiée.')
      } else {
        const { data } = await axios.post(`/api/etablissements/${etabId}/filieres`, form)
        update([...filieres, { ...data, nb_formations: 0 }])
        toast.success('Filière créée.')
      }
      await refreshFilieres()
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, nom) => {
    if (!confirm(`Supprimer la filière « ${nom} » ?`)) return
    try {
      await axios.delete(`/api/etablissements/${etabId}/filieres/${id}`)
      update(filieres.filter(f => f.id !== id))
      toast.success('Filière supprimée.')
      await refreshFilieres()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <FaBook className="h-4 w-4" aria-hidden />
            </span>
            Filières d’enseignement
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Regroupez vos formations par filière (ex. santé, commerce). Les statistiques de formations se mettent à jour automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm shrink-0"
        >
          <FaPlus className="h-3.5 w-3.5" aria-hidden />
          Nouvelle filière
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <FaLayerGroup className="h-4 w-4 text-slate-400" aria-hidden />
        <span className="font-medium tabular-nums">{filieres.length}</span>
        <span>filière{filieres.length !== 1 ? 's' : ''} enregistrée{filieres.length !== 1 ? 's' : ''}</span>
      </div>

      {filieres.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <FaBook className="h-7 w-7 text-slate-300" aria-hidden />
          </div>
          <p className="font-semibold text-slate-800">Aucune filière pour l’instant</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Créez une filière pour pouvoir rattacher des formations et structurer votre catalogue.
          </p>
          <button type="button" onClick={openCreate} className="btn-primary mt-6 inline-flex items-center gap-2 rounded-xl">
            <FaPlus className="h-3.5 w-3.5" aria-hidden />
            Créer une filière
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filieres.map((f) => (
            <li
              key={f.id}
              className={`group flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between transition-shadow ${
                f.actif === false
                  ? 'border-slate-100 bg-slate-50/80 opacity-75'
                  : 'border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-indigo-200/60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-slate-50 text-indigo-700 ring-1 ring-indigo-100/80">
                  <FaBook className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{f.nom}</p>
                    {f.code && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                        {f.code}
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{f.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{(f.nb_formations_actives ?? f.nb_formations ?? 0)} formation(s) active(s)</span>
                    {f.nb_formations_inactives > 0 && <span>{f.nb_formations_inactives} désactivée(s)</span>}
                    <span>{f.nb_formations_presentiel || 0} présentiel</span>
                    <span>{f.nb_formations_en_ligne || 0} à distance</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 sm:pl-2">
                <button
                  type="button"
                  onClick={() => openEdit(f)}
                  className="text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(f.id, f.nom)}
                  className="text-xs font-semibold text-red-700 border border-red-200 bg-white hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal filière */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Modifier la filière' : 'Nouvelle filière'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <L>Nom de la filière *</L>
                <input className="input-field" value={form.nom} onChange={up('nom')} required placeholder="Ex: Sciences Infirmières" />
              </div>
              <div>
                <L>Code</L>
                <input className="input-field" value={form.code} onChange={up('code')} placeholder="Ex: SI" />
              </div>
              <div>
                <L>Description</L>
                <textarea className="input-field" rows={2} value={form.description} onChange={up('description')} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Onglet 3 — Formations
// ═══════════════════════════════════════════════════════════════════════
const NIVEAUX = ['Terminale / Bac', 'Bac+1 / Licence 1', 'Bac+2 / Licence 2', 'Licence 3', 'Master 1', 'Master 2', 'Doctorat', 'Autre']

export function TabFormations({ etabId, formations: init, filieres, onRefreshFilieres, onRefreshFormations }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [formations, setFormations] = useState(() => (Array.isArray(init) ? init : []))
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtreFiliere, setFiltreFiliere] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [searchText, setSearchText] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importDryRun, setImportDryRun] = useState(true)
  const [importResult, setImportResult] = useState(null)
  const EMPTY = {
    filiere_id: '', titre: '', type: 'presentiel', niveau: '', niveau_requis: '', duree: '', description: '', ville: '', places: '',
    frais_inscription: '', mensualite: '', duree_mois: '', frais_soutenance: '', autres_frais: '0',
    frais_supplementaires: [],
    nombre_photos_preinscription: '1',
  }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [hardDeleteModal, setHardDeleteModal] = useState(null)
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [showBatchEdit, setShowBatchEdit] = useState(false)
  const [batchRows, setBatchRows] = useState([])
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchApiErrors, setBatchApiErrors] = useState([])

  useEffect(() => {
    if (init !== undefined) setFormations(Array.isArray(init) ? init : [])
  }, [init])

  const up = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (f) => {
    setEditing(f)
    const supp = Array.isArray(f.frais_supplementaires) && f.frais_supplementaires.length
      ? f.frais_supplementaires.map((x) => ({
          designation: String(x.designation || ''),
          montant: String(x.montant ?? ''),
        }))
      : (f.autres_frais > 0
        ? [{ designation: 'Autres frais', montant: String(f.autres_frais) }]
        : [])
    setForm({
      filiere_id: String(f.filiere_id || ''),
      titre: f.titre,
      type: f.type,
      niveau: f.niveau || '',
      niveau_requis: f.niveau_requis || '',
      duree: f.duree || '',
      description: f.description || '',
      ville: f.ville || '',
      places: String(f.places || ''),
      frais_inscription: String(f.frais_inscription || ''),
      mensualite: String(f.mensualite || ''),
      duree_mois: String(f.duree_mois ?? ''),
      frais_soutenance: String(f.frais_soutenance || ''),
      autres_frais: String(f.autres_frais || '0'),
      frais_supplementaires: supp.length ? supp : [],
      nombre_photos_preinscription: String(f.nombre_photos_preinscription ?? 1),
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        filiere_id: form.filiere_id,
        titre: form.titre,
        type: form.type,
        niveau: form.niveau,
        niveau_requis: form.niveau_requis,
        duree: form.duree,
        description: form.description,
        ville: form.ville,
        places: parseInt(form.places, 10) || 0,
        frais_inscription: parseInt(form.frais_inscription, 10) || 0,
        mensualite: parseInt(form.mensualite, 10) || 0,
        duree_mois: parseInt(form.duree_mois, 10) || 0,
        frais_supplementaires: normalizeFraisSuppFromForm(form.frais_supplementaires),
        frais_soutenance: parseInt(form.frais_soutenance, 10) || 0,
        autres_frais: parseInt(form.autres_frais, 10) || 0,
        nombre_photos_preinscription: Math.min(10, Math.max(1, parseInt(form.nombre_photos_preinscription, 10) || 1)),
      }
      if (editing) {
        const { data } = await axios.put(`/api/etablissements/${etabId}/formations/${editing.id}`, body)
        const filiere = filieres.find(f => f.id === parseInt(data.filiere_id))
        setFormations(prev => prev.map(f => f.id === editing.id ? { ...data, filiere_nom: filiere?.nom } : f))
        toast.success('Formation modifiée.')
      } else {
        const { data } = await axios.post(`/api/etablissements/${etabId}/formations`, body)
        const filiere = filieres.find(f => f.id === parseInt(data.filiere_id))
        setFormations(prev => [...prev, { ...data, filiere_nom: filiere?.nom }])
        toast.success('Formation créée.')
      }
      await onRefreshFilieres?.()
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSaving(false) }
  }

  const handleDeactivate = async (id, titre) => {
    if (!confirm(`Désactiver « ${titre} » ? Elle ne sera plus proposée aux nouveaux dossiers.`)) return
    try {
      await axios.delete(`/api/etablissements/${etabId}/formations/${id}`)
      setFormations(prev => prev.map(f => f.id === id ? { ...f, actif: false } : f))
      toast.success('Formation désactivée.')
      await onRefreshFilieres?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const handleActivate = async (id) => {
    try {
      const { data } = await axios.put(`/api/etablissements/${etabId}/formations/${id}`, { actif: true })
      const filiere = filieres.find(f => f.id === parseInt(data.filiere_id))
      setFormations(prev => prev.map(f => f.id === id ? { ...data, filiere_nom: filiere?.nom } : f))
      toast.success('Formation réactivée.')
      await onRefreshFilieres?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const openHardDeleteModal = (id, titre) => {
    if (!isAdmin) return
    setHardDeleteModal({ id, titre })
  }

  const closeHardDeleteModal = () => {
    if (hardDeleteLoading) return
    setHardDeleteModal(null)
  }

  const submitHardDelete = async () => {
    if (!hardDeleteModal || !isAdmin) return
    const { id } = hardDeleteModal
    setHardDeleteLoading(true)
    try {
      await axios.delete(`/api/etablissements/${etabId}/formations/${id}?hard=true`)
      setFormations(prev => prev.filter(f => f.id !== id))
      toast.success('Formation supprimée définitivement.')
      closeHardDeleteModal()
      await onRefreshFilieres?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setHardDeleteLoading(false)
    }
  }

  const searchNorm = String(searchText || '').trim().toLowerCase()
  const affichees = formations.filter((f) => {
    const byFiliere = !filtreFiliere || String(f.filiere_id) === filtreFiliere
    const byType = !filtreType || f.type === filtreType
    if (!searchNorm) return byFiliere && byType
    const haystack = [
      f.titre,
      f.niveau,
      f.niveau_requis,
      f.ville,
      f.filiere_nom,
      f.type === 'en_ligne' ? 'fad' : 'presentiel',
    ].filter(Boolean).join(' ').toLowerCase()
    return byFiliere && byType && haystack.includes(searchNorm)
  })

  const afficheesIds = affichees.map((f) => f.id)
  const selectedCount = selectedIds.length

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectAllVisible = () => {
    if (selectedIds.length === afficheesIds.length && afficheesIds.length > 0) setSelectedIds([])
    else setSelectedIds([...afficheesIds])
  }

  const selectByCurrentFiliere = () => {
    if (!filtreFiliere) {
      toast.error('Sélectionnez d’abord une filière.')
      return
    }
    const ids = formations.filter((f) => String(f.filiere_id) === String(filtreFiliere)).map((f) => f.id)
    setSelectedIds(ids)
    toast.success(`${ids.length} formation(s) sélectionnée(s) sur cette filière.`)
  }

  const clearSelection = () => setSelectedIds([])

  const selectedFiliereId = filtreFiliere || ''

  /** Mise à jour d’une ligne du lot + recalcul du forfait annuel affiché. */
  const updateBatchRow = (i, patch) => {
    setBatchRows((p) =>
      p.map((row, idx) => {
        if (idx !== i) return row
        const next = { ...row, ...patch }
        if (patch.type === 'en_ligne') next.ville = ''
        const fi = parseInt(String(next.frais_inscription), 10) || 0
        const men = parseInt(String(next.mensualite), 10) || 0
        const mois = parseInt(String(next.duree_mois), 10) || 0
        next.prix = String(fi + men * mois)
        return next
      })
    )
  }

  const removeBatchRow = (i) => {
    setBatchRows((p) => {
      const row = p[i]
      if (!row) return p
      if (
        row.id != null &&
        !confirm('Retirer cette ligne du tableau ? (aucune modification en base tant que vous n’avez pas validé.)')
      ) {
        return p
      }
      return p.filter((_, idx) => idx !== i)
    })
  }

  const openBatchEdit = () => {
    const rows = formations
      .filter((f) => selectedIds.includes(f.id))
      .map((f) => ({
        _tmpId: `existing-${f.id}`,
        id: f.id,
        filiere_id: String(f.filiere_id || ''),
        titre: f.titre || '',
        type: f.type || 'presentiel',
        niveau: f.niveau || '',
        niveau_requis: f.niveau_requis || '',
        duree: f.duree || '',
        ville: f.ville || '',
        places: String(f.places || 0),
        frais_inscription: String(f.frais_inscription || 0),
        mensualite: String(f.mensualite || 0),
        duree_mois: String(f.duree_mois ?? ''),
        prix: String(
          computeScolariteAnnuelle(f.frais_inscription, f.mensualite, f.duree_mois) || f.prix || 0
        ),
        frais_soutenance: String(f.frais_soutenance || 0),
        autres_frais: String(f.autres_frais || 0),
        frais_supplementaires_json: JSON.stringify(
          Array.isArray(f.frais_supplementaires) && f.frais_supplementaires.length
            ? f.frais_supplementaires
            : f.autres_frais > 0
              ? [{ designation: 'Autres frais', montant: f.autres_frais }]
              : [],
          null,
          0
        ),
        nombre_photos_preinscription: String(f.nombre_photos_preinscription ?? 1),
        actif: f.actif !== false,
      }))
    if (rows.length === 0) {
      toast.error('Aucune formation sélectionnée.')
      return
    }
    setBatchApiErrors([])
    setBatchRows(rows)
    setShowBatchEdit(true)
  }

  const addBatchRow = () => {
    const defaultFiliere = filtreFiliere || (filieres[0] ? String(filieres[0].id) : '')
    if (!defaultFiliere) {
      toast.error('Créez d’abord une filière pour ajouter une formation.')
      return
    }
    const nextTmp = `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setBatchRows((prev) => ([
      ...prev,
      {
        _tmpId: nextTmp,
        id: null,
        filiere_id: defaultFiliere,
        titre: '',
        type: 'presentiel',
        niveau: '',
        niveau_requis: '',
        duree: '',
        ville: '',
        places: '0',
        frais_inscription: '0',
        mensualite: '0',
        duree_mois: '0',
        prix: '0',
        frais_soutenance: '0',
        autres_frais: '0',
        frais_supplementaires_json: '[]',
        nombre_photos_preinscription: '1',
        actif: true,
      },
    ]))
  }

  const saveBatchEdit = async () => {
    if (batchRows.length === 0) return
    const localIssues = validateBatchFormationRows(batchRows)
    if (localIssues.length > 0) {
      setBatchApiErrors(localIssues.map((x) => ({ index: x.index, message: x.message })))
      toast.error(`Corrigez ${localIssues.length} erreur(s) avant d’enregistrer (voir le détail ci-dessous).`)
      return
    }
    setBatchApiErrors([])
    setBatchSaving(true)
    try {
      const payload = batchRows.map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        filiere_id: parseInt(r.filiere_id, 10),
        titre: String(r.titre || '').trim(),
        type: r.type,
        niveau: r.niveau,
        niveau_requis: r.niveau_requis,
        duree: r.duree,
        ville: r.type === 'presentiel' ? r.ville : null,
        places: parseInt(r.places || 0, 10),
        frais_inscription: parseInt(r.frais_inscription || 0, 10),
        mensualite: parseInt(r.mensualite || 0, 10),
        duree_mois: parseInt(r.duree_mois || 0, 10),
        frais_soutenance: parseInt(r.frais_soutenance || 0, 10),
        autres_frais: parseInt(r.autres_frais || 0, 10),
        frais_supplementaires: parseFraisSuppJson(r.frais_supplementaires_json),
        actif: !!r.actif,
        nombre_photos_preinscription: Math.min(10, Math.max(1, parseInt(r.nombre_photos_preinscription, 10) || 1)),
      }))
      const { data } = await axios.put(`/api/etablissements/${etabId}/formations/batch`, { items: payload })
      await onRefreshFilieres?.()
      await onRefreshFormations?.()
      const errs = Array.isArray(data.errors) ? data.errors : []
      setBatchApiErrors(errs)
      if (errs.length > 0) {
        toast.error(
          `${data.message || 'Traitement partiel.'} — ${errs.length} ligne(s) en erreur (voir le détail).`,
          { duration: 6000 }
        )
      } else {
        toast.success(data.message || 'Modifications par lot enregistrées.')
        setShowBatchEdit(false)
        clearSelection()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification par lot.')
    } finally {
      setBatchSaving(false)
    }
  }

  const deleteBatch = async () => {
    if (selectedIds.length === 0) return
    const isHard = isAdmin && confirm('Suppression définitive (hard delete) ? Cliquez "Annuler" pour désactivation simple.')
    if (!isHard && !confirm(`Désactiver ${selectedIds.length} formation(s) sélectionnée(s) ?`)) return
    try {
      const { data } = await axios.post(`/api/etablissements/${etabId}/formations/delete-batch`, {
        ids: selectedIds,
        hard: isHard,
      })
      if (data.hard) {
        setFormations((prev) => prev.filter((f) => !selectedIds.includes(f.id)))
      } else {
        setFormations((prev) =>
          prev.map((f) => (selectedIds.includes(f.id) ? { ...f, actif: false } : f))
        )
      }
      await onRefreshFilieres?.()
      toast.success(data.message || 'Traitement par lot terminé.')
      clearSelection()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression par lot.')
    }
  }

  const downloadTemplate = () => {
    const csv = [
      'titre;type;niveau;niveau_requis;duree;description;ville;places;frais_inscription;prix;mensualite;frais_soutenance;autres_frais;actif',
      'Licence 1 Genie Civil;presentiel;L1;Baccalaureat;3 ans;Bases du genie civil;Dakar;60;25000;350000;0;0;0;true',
      'Certification DAO BTP;en_ligne;Certificat;Baccalaureat;6 mois;AutoCAD et dessin technique;;120;15000;180000;30000;0;0;true',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', 'template-formations-lot.csv')
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!selectedFiliereId) {
      toast.error('Sélectionnez une filière (en haut) avant l’import en lot.')
      return
    }
    if (!importFile) {
      toast.error('Choisissez un fichier CSV.')
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const { data } = await axios.post(
        `/api/etablissements/${etabId}/formations/import/${selectedFiliereId}?dry_run=${importDryRun}`,
        fd
      )
      setImportResult(data)
      toast.success(importDryRun ? 'Validation terminée.' : 'Import en lot terminé.')
      if (!importDryRun) {
        await onRefreshFormations?.()
        await onRefreshFilieres?.()
      }
    } catch (err) {
      const payload = err.response?.data
      setImportResult(payload || null)
      toast.error(payload?.message || 'Erreur pendant l’import CSV')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <FaGraduationCap className="h-4 w-4" aria-hidden />
            </span>
            Catalogue des formations
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Filtrez par filière et recherchez par intitulé. Sélectionnez des lignes pour les actions par lot ou importez un fichier CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            disabled={filieres.length === 0}
            title={filieres.length === 0 ? 'Créez d’abord une filière' : 'Importer un lot CSV pour la filière sélectionnée'}
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm"
          >
            <FaPlus className="h-3.5 w-3.5" aria-hidden />
            Nouvelle formation
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              className="input-field w-full rounded-xl border-slate-200 bg-white py-2 pl-9 text-sm shadow-sm"
              placeholder="Rechercher une formation…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              aria-label="Rechercher une formation"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="input-field min-w-[180px] rounded-xl border-slate-200 bg-white py-2 text-sm shadow-sm"
              value={filtreFiliere}
              onChange={(e) => setFiltreFiliere(e.target.value)}
            >
              <option value="">Toutes les filières</option>
              {filieres.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.nom}
                </option>
              ))}
            </select>
            <select
              className="input-field min-w-[160px] rounded-xl border-slate-200 bg-white py-2 text-sm shadow-sm"
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
            >
              <option value="">Tous les modes</option>
              <option value="presentiel">Présentiel</option>
              <option value="en_ligne">À distance (FAD)</option>
            </select>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-indigo-900">{selectedCount} formation(s) sélectionnée(s)</span>
          <button type="button" onClick={openBatchEdit} className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-300 text-indigo-800 hover:bg-indigo-100">
            Modifier par lot
          </button>
          <button type="button" onClick={deleteBatch} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50">
            Supprimer par lot
          </button>
          <button type="button" onClick={clearSelection} className="text-xs underline text-gray-600 ml-auto">
            Vider la sélection
          </button>
        </div>
      )}

      {(filtreFiliere || filtreType || searchNorm) && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          Filtre actif : {searchNorm ? 'recherche' : ''}{searchNorm && (filtreFiliere || filtreType) ? ' + ' : ''}{filtreFiliere ? 'filière' : ''}{filtreFiliere && filtreType ? ' + ' : ''}{filtreType ? 'type' : ''}
          <button
            type="button"
            className="underline"
            onClick={() => { setFiltreFiliere(''); setFiltreType(''); setSearchText('') }}
          >
            Afficher tout
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={selectAllVisible} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
          {selectedIds.length === afficheesIds.length && afficheesIds.length > 0 ? 'Tout désélectionner' : 'Sélectionner le résultat affiché'}
        </button>
        <button type="button" onClick={selectByCurrentFiliere} className="text-xs px-2.5 py-1.5 rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50">
          Sélectionner la filière filtrée
        </button>
      </div>

      {affichees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <FaGraduationCap className="h-7 w-7 text-slate-300" aria-hidden />
          </div>
          <p className="font-semibold text-slate-800">Aucune formation à afficher</p>
          <p className="text-sm text-slate-500 mt-1">
            {filieres.length === 0
              ? 'Créez d’abord une filière dans l’onglet Filières.'
              : 'Créez une formation ou ajustez les filtres / la recherche.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {affichees.map(f => (
            <div key={f.id} className={`rounded-2xl border p-4 sm:p-5 transition-shadow ${f.actif === false ? 'opacity-60 bg-slate-50 border-slate-100' : 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-200/50'}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 min-w-0">
                  <label className="inline-flex cursor-pointer items-center gap-2 mb-3 text-xs font-medium text-slate-500">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.includes(f.id)}
                      onChange={() => toggleSelect(f.id)}
                    />
                    Inclure dans la sélection
                  </label>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900 text-base">{f.titre}</p>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${f.type === 'en_ligne' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/50' : 'bg-sky-100 text-sky-800 ring-1 ring-sky-200/50'}`}>
                      {f.type === 'en_ligne' ? 'À distance (FAD)' : 'Présentiel'}
                    </span>
                    {f.actif === false && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold ring-1 ring-red-100">Désactivé</span>}
                  </div>
                  {f.filiere_nom && <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1"><FaBook className="h-3 w-3 opacity-80" aria-hidden />{f.filiere_nom}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-500">
                    {f.duree && <span>⏱ {f.duree}</span>}
                    {f.ville && <span>📍 {f.ville}</span>}
                    {f.places > 0 && <span>👥 {f.places} places</span>}
                    {f.niveau_requis && <span>📋 {f.niveau_requis}</span>}
                  </div>
                  {/* Tarifs */}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      { l: 'Inscription', v: f.frais_inscription },
                      { l: 'Mensualité', v: f.mensualite },
                      { l: 'Durée (mois)', v: f.duree_mois },
                      { l: 'Scolarité annuelle', v: f.prix },
                      { l: 'Soutenance', v: f.frais_soutenance },
                    ].filter(s => s.v > 0).map(s => (
                      <div key={s.l} className="bg-gray-50 rounded-lg px-2 py-1 text-center">
                        <p className="text-gray-400 text-xs">{s.l}</p>
                        <p className="font-bold text-gray-800 text-xs">{fmt(s.v)}{s.l.includes('mois') ? '' : <> <span className="font-normal text-gray-400">FCFA</span></>}</p>
                      </div>
                    ))}
                    {Array.isArray(f.frais_supplementaires) && f.frais_supplementaires.map((x, j) => (
                      x.montant > 0 && (
                        <div key={`fs-${j}`} className="bg-amber-50 rounded-lg px-2 py-1 text-center border border-amber-100">
                          <p className="text-amber-800 text-xs truncate" title={x.designation}>+ {x.designation}</p>
                          <p className="font-bold text-amber-900 text-xs">{fmt(x.montant)} <span className="font-normal text-amber-700">FCFA</span></p>
                          <p className="text-[10px] text-amber-700">hors forfait</p>
                        </div>
                      )
                    ))}
                    {(!f.frais_supplementaires || f.frais_supplementaires.length === 0) && f.autres_frais > 0 && (
                      <div className="bg-amber-50 rounded-lg px-2 py-1 text-center border border-amber-100">
                        <p className="text-gray-400 text-xs">Autres frais (legacy)</p>
                        <p className="font-bold text-gray-800 text-xs">{fmt(f.autres_frais)} <span className="font-normal text-gray-400">FCFA</span></p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0 justify-start lg:justify-end lg:pt-7">
                  <button type="button" onClick={() => openEdit(f)} className="text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 px-3 py-2 rounded-xl">Modifier</button>
                  {f.actif !== false ? (
                    <button type="button" onClick={() => handleDeactivate(f.id, f.titre)} className="text-xs font-semibold text-amber-800 border border-amber-200 bg-white hover:bg-amber-50 px-3 py-2 rounded-xl">Désactiver</button>
                  ) : (
                    <button type="button" onClick={() => handleActivate(f.id)} className="text-xs font-semibold text-emerald-800 border border-emerald-200 bg-white hover:bg-emerald-50 px-3 py-2 rounded-xl">Activer</button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openHardDeleteModal(f.id, f.titre)}
                      className="text-xs font-semibold text-red-700 border border-red-200 bg-white hover:bg-red-50 px-3 py-2 rounded-xl"
                      title="Admin uniquement — suppression définitive de la fiche formation"
                    >
                      Supprimer déf.
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale suppression définitive (admin) */}
      {hardDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-red-100">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-red-800">Suppression définitive</h3>
              <p className="text-sm text-gray-600 mt-2">
                Supprimer définitivement « <strong>{hardDeleteModal.titre}</strong> » ? Les liens vers cette formation seront retirés des dossiers, proformas et factures ; les libellés déjà enregistrés (snapshots, dossier) restent consultables.
              </p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-3">
                <button type="button" onClick={closeHardDeleteModal} disabled={hardDeleteLoading} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submitHardDelete}
                  disabled={hardDeleteLoading}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40"
                >
                  {hardDeleteLoading ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal formation */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Modifier la formation' : 'Nouvelle formation'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <L>Intitulé de la formation *</L>
                  <input className="input-field" value={form.titre} onChange={up('titre')} required placeholder="Ex: Licence en Sciences Infirmières" />
                </div>
                <div>
                  <L>Filière *</L>
                  <select className="input-field" value={form.filiere_id} onChange={up('filiere_id')} required>
                    <option value="">-- Sélectionner --</option>
                    {filieres.map(f => <option key={f.id} value={String(f.id)}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <L>Mode *</L>
                  <select className="input-field" value={form.type} onChange={up('type')}>
                    <option value="presentiel">🏫 Présentiel</option>
                    <option value="en_ligne">🌐 Formation à distance (FAD)</option>
                  </select>
                </div>
                <div>
                  <L>Niveau</L>
                  <select className="input-field" value={form.niveau} onChange={up('niveau')}>
                    <option value="">-- Sélectionner --</option>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <L>Niveau requis (prérequis)</L>
                  <input className="input-field" value={form.niveau_requis} onChange={up('niveau_requis')} placeholder="Ex: Baccalauréat" />
                </div>
                {form.niveau ? (
                  <div className="col-span-2">
                    <PreinscriptionConditionsBlock formationNiveau={form.niveau} />
                  </div>
                ) : null}
                <div>
                  <L>Durée (libellé)</L>
                  <input className="input-field" value={form.duree} onChange={up('duree')} placeholder="Ex: 3 ans" />
                </div>
                <div>
                  <L>Durée de paiement (mois)</L>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    max="120"
                    value={form.duree_mois}
                    onChange={up('duree_mois')}
                    placeholder="Ex: 9"
                  />
                  <p className="text-xs text-gray-500 mt-1">Utilisé pour le calcul : inscription + mensualité × mois.</p>
                </div>
                <div>
                  <L>Places disponibles</L>
                  <input className="input-field" type="number" min="0" value={form.places} onChange={up('places')} />
                </div>
                <div>
                  <L>Photos d’identité (préinscription)</L>
                  <input
                    className="input-field"
                    type="number"
                    min="1"
                    max="10"
                    value={form.nombre_photos_preinscription}
                    onChange={up('nombre_photos_preinscription')}
                  />
                  <p className="text-xs text-gray-500 mt-1">Nombre de photos à fournir pour chaque dossier (1 à 10), selon cette formation.</p>
                </div>
                {form.type === 'presentiel' && (
                  <div>
                    <L>Ville</L>
                    <input className="input-field" value={form.ville} onChange={up('ville')} placeholder="Ex: Dakar" />
                  </div>
                )}
                <div className="col-span-2">
                  <L>Description</L>
                  <textarea className="input-field" rows={2} value={form.description} onChange={up('description')} />
                </div>

                {/* Tarification */}
                <div className="col-span-2">
                  <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                    <p className="font-semibold text-blue-900 text-sm mb-2">💰 Tarification (FCFA)</p>
                    <p className="text-xs text-blue-800 mb-2">
                      Forfait annuel (scolarité) = frais d&apos;inscription + (mensualité × durée en mois). Les frais supplémentaires ci‑dessous sont indiqués à part (hors total annuel).
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { f: 'frais_inscription', l: 'Frais d\'inscription' },
                        { f: 'mensualite', l: 'Mensualité' },
                        { f: 'frais_soutenance', l: 'Frais de soutenance' },
                      ].map(({ f, l }) => (
                        <div key={f}>
                          <L>{l}</L>
                          <input className="input-field" type="number" min="0" value={form[f]} onChange={up(f)} placeholder="0" />
                        </div>
                      ))}
                      <div className="sm:col-span-3">
                        <L>Scolarité annuelle (calculée)</L>
                        <div className="input-field bg-gray-100 text-gray-900 font-semibold">
                          {fmt(computeScolariteAnnuelle(form.frais_inscription, form.mensualite, form.duree_mois))} FCFA
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-blue-100 pt-3 mt-2">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Frais supplémentaires (hors forfait annuel)</p>
                      <div className="space-y-2">
                        {(form.frais_supplementaires || []).map((row, idx) => (
                          <div key={idx} className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[140px]">
                              <L>Désignation</L>
                              <input
                                className="input-field py-1.5"
                                value={row.designation}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setForm((p) => ({
                                    ...p,
                                    frais_supplementaires: (p.frais_supplementaires || []).map((r, i) =>
                                      i === idx ? { ...r, designation: v } : r
                                    ),
                                  }))
                                }}
                                placeholder="Ex: Kit pédagogique"
                              />
                            </div>
                            <div className="w-32">
                              <L>Montant</L>
                              <input
                                className="input-field py-1.5"
                                type="number"
                                min="0"
                                value={row.montant}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setForm((p) => ({
                                    ...p,
                                    frais_supplementaires: (p.frais_supplementaires || []).map((r, i) =>
                                      i === idx ? { ...r, montant: v } : r
                                    ),
                                  }))
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className="text-xs text-red-600 mb-1"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  frais_supplementaires: (p.frais_supplementaires || []).filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              Retirer
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-sm text-blue-700 hover:underline"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              frais_supplementaires: [...(p.frais_supplementaires || []), { designation: '', montant: '' }],
                            }))
                          }
                        >
                          + Ajouter un frais supplémentaire
                        </button>
                      </div>
                      {parseInt(form.autres_frais, 10) > 0 && (!form.frais_supplementaires || form.frais_supplementaires.length === 0) && (
                        <p className="text-xs text-amber-700 mt-2">
                          Ancien champ « autres frais » : {fmt(form.autres_frais)} FCFA — enregistrez pour migrer vers la liste ci‑dessus si besoin.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal import lot CSV */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Import de formations par lot (CSV)</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-700">
                Filière ciblée:{' '}
                <strong>
                  {selectedFiliereId
                    ? (filieres.find((f) => String(f.id) === String(selectedFiliereId))?.nom || `#${selectedFiliereId}`)
                    : 'Aucune'}
                </strong>
              </div>
              {!selectedFiliereId && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Sélectionnez une filière dans le filtre de l’onglet Formations avant de lancer l’import.
                </div>
              )}

              <div className="flex items-center justify-between">
                <button type="button" onClick={downloadTemplate} className="text-sm text-blue-600 hover:underline">
                  Télécharger le template CSV
                </button>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input type="checkbox" checked={importDryRun} onChange={(e) => setImportDryRun(e.target.checked)} />
                  Mode test (dry-run)
                </label>
              </div>

              <input
                type="file"
                accept=".csv,text/csv"
                className="input-field"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />

              <p className="text-xs text-gray-500">
                Colonnes requises: `titre;type;niveau;niveau_requis;duree;description;ville;places;frais_inscription;prix;mensualite;frais_soutenance;autres_frais;actif`
                <br />
                Type accepté: `presentiel`, `en_ligne`, `en ligne`, `fad`, `online`. Pour `en_ligne`, la colonne `ville` peut rester vide.
              </p>

              {importResult && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  <p className="font-semibold text-gray-800">{importResult.ok ? 'Validation OK' : 'Validation avec erreurs'}</p>
                  <p className="text-gray-600">
                    Lignes: {importResult.summary?.total_rows ?? 0} | Créées: {importResult.summary?.created ?? 0} | Ignorées: {importResult.summary?.skipped ?? 0}
                  </p>
                  {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                    <ul className="mt-2 text-xs text-red-700 space-y-1 max-h-28 overflow-auto">
                      {importResult.errors.slice(0, 8).map((e, i) => (
                        <li key={i}>Ligne {e.row} · {e.field}: {e.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowImport(false)} className="btn-secondary flex-1">Fermer</button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || !selectedFiliereId}
                  className="btn-primary flex-1 disabled:opacity-40"
                >
                  {importing ? 'Traitement...' : (importDryRun ? 'Valider CSV' : 'Importer le lot')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchEdit && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[96rem] max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Modification par lot des formations</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {batchRows.length} ligne(s) — forfait annuel = inscription + (mensualité × mois). Frais supplémentaires : JSON tableau, ex.{' '}
                  <code className="text-[10px] bg-gray-100 px-1 rounded">[{`{"designation":"Kit","montant":50000}`}]</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowBatchEdit(false); setBatchApiErrors([]) }}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {batchApiErrors.length > 0 && (
              <div className="mx-5 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex-shrink-0">
                <p className="font-semibold mb-2">
                  {batchApiErrors.length} erreur(s) — corrigez les lignes concernées puis réessayez.
                </p>
                <ul className="max-h-28 overflow-y-auto text-xs space-y-1 font-mono">
                  {batchApiErrors.map((e, k) => (
                    <li key={k}>
                      Ligne {(e.index != null ? e.index + 1 : '?')}
                      {e.id != null ? ` (id ${e.id})` : ''} : {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-4 flex-1 min-h-0 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-gray-500">
                  En-tête fixe au défilement — défilement horizontal si besoin.
                </span>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-50"
                  onClick={addBatchRow}
                >
                  + Ajouter une formation
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm min-w-[1280px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                    <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                      <th className="py-2.5 px-2 w-8 text-center">#</th>
                      <th className="py-2.5 px-2">Titre *</th>
                      <th className="py-2.5 px-2">Filière *</th>
                      <th className="py-2.5 px-2">Type</th>
                      <th className="py-2.5 px-2">Niveau</th>
                      <th className="py-2.5 px-2 min-w-[6rem]">Niv. requis</th>
                      <th className="py-2.5 px-2 min-w-[5rem]">Durée</th>
                      <th className="py-2.5 px-2">Ville</th>
                      <th className="py-2.5 px-2 w-14">Pl.</th>
                      <th className="py-2.5 px-2">Inscr.</th>
                      <th className="py-2.5 px-2">Mois</th>
                      <th className="py-2.5 px-2">Mens.</th>
                      <th className="py-2.5 px-2">Sout.</th>
                      <th className="py-2.5 px-2">Autres</th>
                      <th className="py-2.5 px-2 w-12" title="Photos d’identité (préinscription)">Ph.</th>
                      <th className="py-2.5 px-2 whitespace-nowrap">Forfait annuel</th>
                      <th className="py-2.5 px-2 min-w-[7rem]">Frais sup. JSON</th>
                      <th className="py-2.5 px-2 text-center">Actif</th>
                      <th className="py-2.5 px-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((r, i) => {
                      const rowErr = batchApiErrors.some((e) => e.index === i)
                      return (
                        <tr
                          key={r._tmpId || r.id || i}
                          className={`border-b border-gray-100 ${rowErr ? 'bg-red-50/80' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="py-2 px-2 text-center text-xs text-gray-400">{i + 1}</td>
                          <td className="py-2 px-2">
                            <input
                              className="input-field py-1.5 min-w-[8rem] w-full"
                              value={r.titre}
                              onChange={(e) => updateBatchRow(i, { titre: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              className="input-field py-1.5 min-w-[7rem] w-full"
                              value={r.filiere_id}
                              onChange={(e) => updateBatchRow(i, { filiere_id: e.target.value })}
                            >
                              <option value="">—</option>
                              {filieres.map((f) => (
                                <option key={f.id} value={String(f.id)}>{f.nom}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <select
                              className="input-field py-1.5 w-full"
                              value={r.type}
                              onChange={(e) => updateBatchRow(i, { type: e.target.value })}
                            >
                              <option value="presentiel">Présentiel</option>
                              <option value="en_ligne">En ligne</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              className="input-field py-1.5 min-w-[7rem] w-full"
                              list={`batch-niveaux-${i}`}
                              value={r.niveau}
                              onChange={(e) => updateBatchRow(i, { niveau: e.target.value })}
                              placeholder="Niveau"
                            />
                            <datalist id={`batch-niveaux-${i}`}>
                              {NIVEAUX.map((n) => <option key={n} value={n} />)}
                            </datalist>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              className="input-field py-1.5 w-full text-xs"
                              value={r.niveau_requis}
                              onChange={(e) => updateBatchRow(i, { niveau_requis: e.target.value })}
                              placeholder="ex. Bac"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              className="input-field py-1.5 w-full text-xs"
                              value={r.duree}
                              onChange={(e) => updateBatchRow(i, { duree: e.target.value })}
                              placeholder="ex. 2 ans"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              className={`input-field py-1.5 w-full min-w-[4rem] ${r.type === 'en_ligne' ? 'opacity-50' : ''}`}
                              value={r.ville}
                              disabled={r.type === 'en_ligne'}
                              onChange={(e) => updateBatchRow(i, { ville: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              className="input-field py-1.5 w-full"
                              value={r.places}
                              onChange={(e) => updateBatchRow(i, { places: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              className="input-field py-1.5 w-full min-w-[4.5rem]"
                              value={r.frais_inscription}
                              onChange={(e) => updateBatchRow(i, { frais_inscription: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              max="120"
                              className="input-field py-1.5 w-full min-w-[3rem]"
                              value={r.duree_mois}
                              onChange={(e) => updateBatchRow(i, { duree_mois: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              className="input-field py-1.5 w-full min-w-[4.5rem]"
                              value={r.mensualite}
                              onChange={(e) => updateBatchRow(i, { mensualite: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              className="input-field py-1.5 w-full min-w-[4rem]"
                              value={r.frais_soutenance}
                              onChange={(e) => updateBatchRow(i, { frais_soutenance: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              className="input-field py-1.5 w-full min-w-[4rem]"
                              value={r.autres_frais}
                              onChange={(e) => updateBatchRow(i, { autres_frais: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              title="Nombre de photos exigées (1–10)"
                              className="input-field py-1.5 w-full min-w-[2.5rem]"
                              value={r.nombre_photos_preinscription ?? '1'}
                              onChange={(e) => updateBatchRow(i, { nombre_photos_preinscription: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-2 text-xs font-bold text-slate-800 whitespace-nowrap tabular-nums">
                            {fmt(r.prix)}
                          </td>
                          <td className="py-2 px-2 align-top">
                            <textarea
                              className="input-field py-1 text-[11px] font-mono w-full min-w-[6rem] min-h-[2.75rem]"
                              value={r.frais_supplementaires_json}
                              onChange={(e) => updateBatchRow(i, { frais_supplementaires_json: e.target.value })}
                              placeholder="[]"
                              rows={2}
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!r.actif}
                              onChange={(e) => updateBatchRow(i, { actif: e.target.checked })}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              title="Retirer cette ligne"
                              className="text-red-600 hover:text-red-800 text-lg leading-none px-1"
                              onClick={() => removeBatchRow(i)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-3 flex-shrink-0 bg-gray-50/80">
              <button
                type="button"
                className="btn-secondary flex-1 min-w-[8rem]"
                onClick={() => { setShowBatchEdit(false); setBatchApiErrors([]) }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary flex-1 min-w-[8rem] disabled:opacity-40"
                disabled={batchSaving || batchRows.length === 0}
                onClick={saveBatchEdit}
              >
                {batchSaving ? 'Enregistrement…' : 'Valider les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Onglet 4 — Membres
// ═══════════════════════════════════════════════════════════════════════
const EMPTY_MEMBRE_FORM = {
  prenom: '', nom: '', email: '', telephone: '', adresse: '', date_naissance: '',
  mot_de_passe: '', mot_de_passe_confirmation: '', role: 'responsable',
}

const EMPTY_EDIT_FORM = {
  prenom: '', nom: '', email: '', telephone: '', adresse: '', role: 'responsable', actif: true,
  mot_de_passe: '', mot_de_passe_confirmation: '',
}

function TabMembres({ etabId, membres: init, responsable_id }) {
  const { user } = useAuth()
  const canCreateStaffAccount = user?.role === 'admin'
  const canDeleteStaffPermanently = user?.role === 'admin'
  const [membres, setMembres] = useState(init || [])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_MEMBRE_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [savingEdit, setSavingEdit] = useState(false)
  const [permanentFor, setPermanentFor] = useState(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [permanentSaving, setPermanentSaving] = useState(false)

  useEffect(() => {
    setMembres(init || [])
  }, [init])

  const up = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const upEdit = f => e => {
    const v = f === 'actif' ? e.target.checked : e.target.value
    setEditForm(p => ({ ...p, [f]: v }))
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return membres
    return membres.filter(m => {
      const blob = `${m.prenom} ${m.nom} ${m.email} ${m.matricule || ''} ${m.role}`.toLowerCase()
      return blob.includes(s)
    })
  }, [membres, q])

  const openEdit = m => {
    setEditId(m.id)
    setEditForm({
      prenom: m.prenom || '',
      nom: m.nom || '',
      email: m.email || '',
      telephone: m.telephone || '',
      adresse: m.adresse || '',
      role: m.role || 'responsable',
      actif: m.actif !== false,
      mot_de_passe: '',
      mot_de_passe_confirmation: '',
    })
  }

  const handleCreate = async e => {
    e.preventDefault()
    if (form.mot_de_passe !== form.mot_de_passe_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (!form.date_naissance?.trim()) {
      toast.error('La date de naissance est obligatoire.')
      return
    }
    setSaving(true)
    try {
      const { data } = await axios.post(`/api/etablissements/${etabId}/membres`, form)
      setMembres(prev => [...prev, { ...data, actif: data.actif !== false, created_at: new Date().toISOString() }])
      toast.success(
        data.matricule
          ? `Membre créé — matricule ${data.matricule}. Changement de mot de passe obligatoire à la première connexion.`
          : 'Membre créé. Il devra changer son mot de passe à la première connexion.'
      )
      setShowForm(false)
      setForm(EMPTY_MEMBRE_FORM)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSaving(false) }
  }

  const handleSaveEdit = async e => {
    e.preventDefault()
    if (!editId) return
    if (editForm.mot_de_passe && editForm.mot_de_passe !== editForm.mot_de_passe_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setSavingEdit(true)
    try {
      const payload = {
        prenom: editForm.prenom,
        nom: editForm.nom,
        email: editForm.email,
        telephone: editForm.telephone,
        adresse: editForm.adresse,
        role: editForm.role,
        actif: editForm.actif,
      }
      if (editForm.mot_de_passe?.trim()) payload.mot_de_passe = editForm.mot_de_passe
      const { data } = await axios.put(`/api/etablissements/${etabId}/membres/${editId}`, payload)
      const mem = data.membre
      setMembres(prev => prev.map(m => (m.id === editId ? { ...m, ...mem } : m)))
      toast.success(data.message || 'Membre mis à jour.')
      setEditId(null)
      setEditForm(EMPTY_EDIT_FORM)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSavingEdit(false) }
  }

  const handleDeactivate = async (id, nom) => {
    if (!window.confirm(`Désactiver ${nom} ? Le compte ne pourra plus se connecter.`)) return
    try {
      await axios.delete(`/api/etablissements/${etabId}/membres/${id}`)
      setMembres(prev => prev.map(m => m.id === id ? { ...m, actif: false } : m))
      toast.success('Compte désactivé.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const handleReactivate = async id => {
    try {
      const { data } = await axios.put(`/api/etablissements/${etabId}/membres/${id}`, { actif: true })
      const mem = data.membre
      setMembres(prev => prev.map(m => (m.id === id ? { ...m, ...mem } : m)))
      toast.success('Compte réactivé.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const handlePermanentDelete = async e => {
    e.preventDefault()
    if (!permanentFor) return
    setPermanentSaving(true)
    try {
      await axios.post(`/api/etablissements/${etabId}/membres/${permanentFor.id}/supprimer-definitif`, {
        confirmation_email: confirmEmail.trim(),
      })
      setMembres(prev => prev.filter(m => m.id !== permanentFor.id))
      toast.success('Compte supprimé définitivement.')
      setPermanentFor(null)
      setConfirmEmail('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setPermanentSaving(false) }
  }

  const actifs = membres.filter(m => m.actif !== false).length

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-64 rounded-full bg-violet-500/15 blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200/90 ring-1 ring-white/10">
              <FaShieldAlt className="h-3 w-3" aria-hidden />
              Équipe &amp; accès
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Membres du staff</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Gérez les rôles, l’identité et l’état des comptes. Les étudiants ne sont pas listés ici.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium ring-1 ring-white/10">
                <FaUsers className="h-4 w-4 text-cyan-300" aria-hidden />
                {membres.length} compte{membres.length > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-100 ring-1 ring-emerald-400/30">
                {actifs} actif{actifs > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {canCreateStaffAccount && (
            <button
              type="button"
              onClick={() => { setShowForm(true); setForm(EMPTY_MEMBRE_FORM) }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/40 transition hover:brightness-110 active:scale-[0.98]"
            >
              <FaPlus className="h-4 w-4" aria-hidden />
              Ajouter un membre
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            className="input-field w-full pl-10"
            placeholder="Rechercher par nom, email, matricule, rôle…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Filtrer les membres"
          />
        </div>
        <p className="text-xs text-slate-500">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          {q.trim() ? ` sur ${membres.length}` : ''}
        </p>
      </div>

      {membres.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 text-3xl shadow-inner">👥</div>
          <p className="font-semibold text-slate-700">Aucun membre rattaché</p>
          <p className="mt-1 text-sm text-slate-500">Créez un premier compte pour cet établissement.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(m => (
            <div
              key={m.id}
              className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                m.actif === false
                  ? 'border-slate-200 opacity-90 grayscale-[0.35]'
                  : 'border-slate-100 hover:border-cyan-200/80'
              }`}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 opacity-80"
                aria-hidden
              />
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-sm font-black text-slate-700 shadow-inner ring-1 ring-slate-200/80">
                  {(m.prenom?.[0] || '?').toUpperCase()}
                  {(m.nom?.[0] || '').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">
                    {m.prenom} {m.nom}
                  </p>
                  <p className="truncate text-xs text-slate-500">{m.email}</p>
                  {m.matricule && (
                    <p className="mt-1 font-mono text-[11px] font-semibold text-slate-600">{m.matricule}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLES_STAFF.find(r => r.val === m.role)?.label || m.role}
                    </span>
                    {m.id === responsable_id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                        <FaUserTie className="h-3 w-3" aria-hidden />
                        Désigné resp.
                      </span>
                    )}
                    {m.actif === false && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 ring-1 ring-red-100">
                        Inactif
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="inline-flex flex-1 min-w-[6rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/50"
                >
                  <FaEdit className="h-3.5 w-3.5" aria-hidden />
                  Modifier
                </button>
                {m.actif !== false ? (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(m.id, `${m.prenom} ${m.nom}`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                  >
                    <FaUserCog className="h-3.5 w-3.5 opacity-80" aria-hidden />
                    Désactiver
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReactivate(m.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <FaUndo className="h-3.5 w-3.5" aria-hidden />
                    Réactiver
                  </button>
                )}
                {canDeleteStaffPermanently && (
                  <button
                    type="button"
                    onClick={() => { setPermanentFor(m); setConfirmEmail('') }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                    title="Suppression irréversible"
                  >
                    <FaTrashAlt className="h-3.5 w-3.5" aria-hidden />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && membres.length > 0 && (
        <p className="text-center text-sm text-slate-500">Aucun membre ne correspond à votre recherche.</p>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">Nouveau membre</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-2xl text-slate-400 hover:text-slate-700" aria-label="Fermer">
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div><L>Prénom *</L><input className="input-field" value={form.prenom} onChange={up('prenom')} required /></div>
                <div><L>Nom *</L><input className="input-field" value={form.nom} onChange={up('nom')} required /></div>
              </div>
              <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Le <strong>matricule</strong> est généré automatiquement (préfixe lié à l’établissement).
              </p>
              <div><L>Date de naissance *</L><input className="input-field" type="date" value={form.date_naissance} onChange={up('date_naissance')} required /></div>
              <div><L>Email *</L><input className="input-field" type="email" value={form.email} onChange={up('email')} required /></div>
              <div>
                <L>Téléphone *</L>
                <input className="input-field" type="tel" value={form.telephone} onChange={up('telephone')} required />
                <p className="mt-1 text-xs text-slate-500">Unique sur toute la plateforme.</p>
              </div>
              <div><L>Adresse</L><input className="input-field" value={form.adresse} onChange={up('adresse')} placeholder="Optionnel" /></div>
              <div><L>Mot de passe *</L><input className="input-field" type="password" value={form.mot_de_passe} onChange={up('mot_de_passe')} required minLength={6} /></div>
              <div><L>Confirmer *</L><input className="input-field" type="password" value={form.mot_de_passe_confirmation} onChange={up('mot_de_passe_confirmation')} required minLength={6} /></div>
              <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Première connexion : changement de mot de passe obligatoire.
              </p>
              <div>
                <L>Rôle *</L>
                <select className="input-field" value={form.role} onChange={up('role')} required>
                  {ROLES_STAFF.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-cyan-50/80 to-white px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">Modifier le membre</h3>
              <button type="button" onClick={() => { setEditId(null); setEditForm(EMPTY_EDIT_FORM) }} className="text-2xl text-slate-400 hover:text-slate-700" aria-label="Fermer">
                ×
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 p-5">
              {editId === responsable_id && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <FaExclamationTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden />
                  <p>
                    Cette personne est le <strong>responsable désigné</strong> de l&apos;établissement. Elle conserve cette fonction
                    même si vous changez son rôle principal ; pour la lui retirer, passez par l&apos;onglet « Responsable ».
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><L>Prénom *</L><input className="input-field" value={editForm.prenom} onChange={upEdit('prenom')} required /></div>
                <div><L>Nom *</L><input className="input-field" value={editForm.nom} onChange={upEdit('nom')} required /></div>
              </div>
              <div><L>Email *</L><input className="input-field" type="email" value={editForm.email} onChange={upEdit('email')} required /></div>
              <div>
                <L>Téléphone *</L>
                <input className="input-field" type="tel" value={editForm.telephone} onChange={upEdit('telephone')} required />
              </div>
              <div><L>Adresse</L><input className="input-field" value={editForm.adresse} onChange={upEdit('adresse')} /></div>
              <div>
                <L>Rôle *</L>
                <select className="input-field" value={editForm.role} onChange={upEdit('role')} required>
                  {ROLES_STAFF.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-cyan-600" checked={editForm.actif} onChange={upEdit('actif')} />
                <span className="text-sm font-semibold text-slate-800">Compte actif (peut se connecter)</span>
              </label>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Réinitialiser le mot de passe</p>
                <p className="mt-1 text-xs text-slate-500">Laissez vide pour ne pas changer. L’utilisateur devra le modifier à la prochaine connexion.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div><L>Nouveau mot de passe</L><input className="input-field" type="password" value={editForm.mot_de_passe} onChange={upEdit('mot_de_passe')} minLength={6} autoComplete="new-password" /></div>
                  <div><L>Confirmation</L><input className="input-field" type="password" value={editForm.mot_de_passe_confirmation} onChange={upEdit('mot_de_passe_confirmation')} minLength={6} /></div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditId(null); setEditForm(EMPTY_EDIT_FORM) }} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={savingEdit} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                  {savingEdit ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permanentFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={handlePermanentDelete} className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-4 text-white">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <FaExclamationTriangle className="h-5 w-5" aria-hidden />
                Suppression définitive
              </h3>
              <p className="mt-1 text-sm text-rose-100">
                Cette action est <strong>irréversible</strong>. Toutes les données de connexion de ce compte seront effacées.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-700">
                Compte : <strong>{permanentFor.prenom} {permanentFor.nom}</strong>
                <br />
                <span className="text-slate-500">{permanentFor.email}</span>
              </p>
              <div>
                <L>Confirmez en saisissant l’email exact du compte *</L>
                <input
                  className="input-field font-mono text-sm"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  placeholder={permanentFor.email}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => { setPermanentFor(null); setConfirmEmail('') }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={permanentSaving}
                  className="flex-1 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                  {permanentSaving ? '…' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Onglet 5 — Responsable
// ═══════════════════════════════════════════════════════════════════════
function TabResponsable({ etabId, responsable: initResp, membres }) {
  const [responsable, setResponsable] = useState(initResp)
  const [selectedId, setSelectedId] = useState(initResp?.id ? String(initResp.id) : '')
  const [saving, setSaving] = useState(false)

  // Tout membre STAFF actif peut être désigné responsable, quel que soit son rôle
  // principal : la fonction « responsable d'établissement » est une responsabilité
  // supplémentaire (le désigné garde son rôle et gagne les droits responsable).
  const eligibles = membres.filter(m => m.actif !== false && m.role !== 'etudiant')

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.put(`/api/etablissements/${etabId}/responsable`, { utilisateur_id: selectedId || null })
      const found = membres.find(m => String(m.id) === selectedId) || null
      setResponsable(found)
      toast.success(selectedId ? 'Responsable désigné.' : 'Responsable retiré.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="card bg-blue-50 border-blue-100">
        <p className="font-semibold text-blue-900 mb-1">Responsable actuel</p>
        {responsable ? (
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-white font-bold text-sm flex items-center justify-center">
              {(responsable.prenom?.[0] || '?')}{(responsable.nom?.[0] || '')}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{responsable.prenom} {responsable.nom}</p>
              <p className="text-xs text-gray-400">{responsable.email} · {responsable.role}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-1">Aucun responsable désigné.</p>
        )}
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-3">Désigner un responsable</p>
        <p className="text-xs text-gray-500 mb-3">
          Tout membre <strong>staff actif</strong> de l&apos;établissement peut être désigné, quel que soit son rôle
          (comptable, agent administratif, contrôleur qualité…). Il conserve son rôle actuel et obtient en plus
          les droits de responsable d&apos;établissement.
        </p>
        {eligibles.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl text-sm text-amber-700">
            ⚠ Ajoutez d&apos;abord un membre staff à cet établissement (onglet <strong>Membres</strong>).
          </div>
        ) : (
          <>
            <select className="input-field mb-4" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">-- Aucun responsable --</option>
              {eligibles.map(m => (
                <option key={m.id} value={String(m.id)}>{m.prenom} {m.nom} ({m.role})</option>
              ))}
            </select>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-40">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
              Enregistrer
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Page principale
// ═══════════════════════════════════════════════════════════════════════
const TABS_ALL = [
  { id: 'identite', label: 'Identité', Icon: FaUniversity },
  { id: 'filieres', label: 'Filières', Icon: FaBook },
  { id: 'formations', label: 'Formations', Icon: FaGraduationCap },
  { id: 'acceptes', label: 'Acceptés', Icon: FaCheckCircle },
  { id: 'factures', label: 'Factures', Icon: FaFileInvoice },
  { id: 'membres', label: 'Membres', Icon: FaUsers },
  { id: 'responsable', label: 'Responsable', Icon: FaUserTie },
]

export default function AdminEtablissementDetail() {
  const { user } = useAuth()
  const { id } = useParams()
  const [etab, setEtab] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('identite')
  const tabsVisible = TABS_ALL

  const kpi = useMemo(() => {
    if (!etab) return { filieres: 0, formations: 0, membres: 0 }
    const filieres = Array.isArray(etab.filieres) ? etab.filieres.length : 0
    const formations = Array.isArray(etab.formations) ? etab.formations.length : 0
    const membres = Array.isArray(etab.membres) ? etab.membres.length : 0
    return { filieres, formations, membres }
  }, [etab])

  const load = () => {
    setLoading(true)
    axios.get(`/api/etablissements/${id}`)
      .then(({ data }) => setEtab(data))
      .catch(() => toast.error('Erreur de chargement.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const refreshFilieresOnly = async () => {
    try {
      const { data } = await axios.get(`/api/etablissements/${id}/filieres`)
      setEtab(prev => prev ? { ...prev, filieres: Array.isArray(data) ? data : prev.filieres } : prev)
    } catch {
      // no-op
    }
  }

  const refreshFormationsOnly = async () => {
    try {
      const { data } = await axios.get(`/api/etablissements/${id}/formations`)
      setEtab(prev => prev ? { ...prev, formations: Array.isArray(data) ? data : prev.formations } : prev)
    } catch {
      // no-op
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent" />
    </div>
  )

  if (!etab) return (
    <main className="max-w-4xl mx-auto px-4 py-8 w-full">
      <p className="text-gray-500">Établissement introuvable.</p>
    </main>
  )

  const primary = etab.couleur_primaire || '#1e40af'

  return (
    <main className="min-h-[calc(100vh-3.5rem)] w-full bg-gradient-to-b from-slate-50 via-white to-slate-50/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10 w-full">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6" aria-label="Fil d'Ariane">
          <Link to="/admin" className="hover:text-blue-700 transition-colors">Administration</Link>
          <FaChevronRight className="h-3 w-3 text-slate-300" aria-hidden />
          <Link to="/admin/etablissements" className="hover:text-blue-700 transition-colors">Établissements</Link>
          <FaChevronRight className="h-3 w-3 text-slate-300" aria-hidden />
          <span className="font-medium text-slate-800 truncate max-w-[12rem] sm:max-w-none">{etab.nom}</span>
        </nav>

        <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm mb-8">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{
              background: `linear-gradient(90deg, ${primary}, ${etab.couleur_secondaire || '#64748b'})`,
            }}
            aria-hidden
          />
          <div className="p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner"
                style={{ borderColor: `${primary}35` }}
              >
                {etab.logo_url ? (
                  <img src={etab.logo_url} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black" style={{ color: primary }}>
                    {String(etab.nom || '?')[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{etab.nom}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-3 w-3 rounded-full ring-2 ring-white shadow" style={{ background: etab.couleur_primaire }} />
                    <span className="h-3 w-3 rounded-full ring-2 ring-white shadow" style={{ background: etab.couleur_secondaire }} />
                    Charte graphique
                  </span>
                  {etab.actif === false && (
                    <span className="text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full ring-1 ring-red-100">
                      Désactivé
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {[
                { label: 'Filières', value: kpi.filieres, Icon: FaBook },
                { label: 'Formations', value: kpi.formations, Icon: FaGraduationCap },
                ...(user?.role === 'admin' ? [{ label: 'Membres', value: kpi.membres, Icon: FaUsers }] : []),
              ].map(({ label, value, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3 min-w-[7.5rem]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-6 bg-gradient-to-b from-slate-50/95 to-transparent backdrop-blur-sm">
          <div
            className="flex gap-1 p-1.5 rounded-2xl bg-slate-100/90 ring-1 ring-slate-200/80 overflow-x-auto"
            role="tablist"
            aria-label="Sections établissement"
          >
            {tabsVisible.map((t) => {
              const Icon = t.Icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 text-sm font-semibold py-2.5 px-3 sm:px-4 rounded-xl transition-all ${
                    active
                      ? 'bg-white text-blue-800 shadow-md ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="card overflow-hidden border-slate-200/80 shadow-md">
          <div className="p-5 md:p-6 lg:p-8">
        {tab === 'identite' && (
          <TabIdentite etab={etab} onUpdated={data => setEtab(prev => ({ ...prev, ...data }))} />
        )}
        {tab === 'filieres' && (
          <TabFilieres
            etabId={etab.id}
            filieres={etab.filieres || []}
            onFiliereChange={list => setEtab(prev => ({ ...prev, filieres: list }))}
          />
        )}
        {tab === 'formations' && (
          <TabFormations
            etabId={etab.id}
            formations={etab.formations}
            filieres={etab.filieres || []}
            onRefreshFilieres={refreshFilieresOnly}
            onRefreshFormations={refreshFormationsOnly}
          />
        )}
        {tab === 'acceptes' && (
          <TabAcceptesParFormation etabId={etab.id} />
        )}
        {tab === 'factures' && (
          <TabFacturesEtab etabId={etab.id} />
        )}
        {tab === 'membres' && (
          <TabMembres etabId={etab.id} membres={etab.membres || []} responsable_id={etab.responsable_id} />
        )}
        {tab === 'responsable' && (
          <TabResponsable etabId={etab.id} responsable={etab.responsable} membres={etab.membres || []} />
        )}
          </div>
        </div>
      </div>
    </main>
  )
}
