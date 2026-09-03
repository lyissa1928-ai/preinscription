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
import FormationExcelGrid from '../../components/FormationExcelGrid'
import { computeScolariteAnnuelle, computeTotalMensualites, dureeLabelFromMois } from '../../lib/formationTarifs'
import { loadColumnState, templateColumnsFromState, formationToGridRow } from '../../lib/formationGridSchema'
import DonneesBackupPanel from '../../components/DonneesBackupPanel'
import { mediaUrl } from '../../utils/mediaUrl'
import {
  canCreateStaffAccount as userCanCreateStaff,
  creatableRoleOptions,
  canManageMembre,
  roleLabel,
} from '../../utils/staffMembresPermissions'

const fmt = n => new Intl.NumberFormat('fr-FR').format(n || 0)

function normalizeFraisSuppFromForm(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map((x) => ({
      designation: String(x?.designation || '').trim(),
      montant: parseInt(x?.montant, 10) || 0,
    }))
    .filter((x) => x.designation && x.montant > 0)
}

const TYPES_ETAB = [
  { val: 'sante',   label: '🏥 Santé' },
  { val: 'btp',     label: '🏗️ BTP / Génie Civil' },
  { val: 'gestion', label: '📊 Commerce / Informatique / Administration' },
]
const ROLE_COLORS = {
  admin_etablissement: 'bg-indigo-100 text-indigo-800',
  responsable: 'bg-teal-100 text-teal-700',
  responsable_fad: 'bg-indigo-100 text-indigo-700',
  agent_fad: 'bg-sky-100 text-sky-800',
  agent_admin: 'bg-orange-100 text-orange-700',
  comptable: 'bg-violet-100 text-violet-700',
  controleur_qualite: 'bg-cyan-100 text-cyan-800',
}

const ROLE_LABELS = {
  admin_etablissement: 'Administrateur établissement',
  responsable: 'Responsable pédagogique',
  responsable_fad: 'Responsable FAD',
  agent_fad: 'Agent FAD',
  agent_admin: 'Agent administratif',
  comptable: 'Comptable',
  controleur_qualite: 'Contrôleur qualité',
}

function staffEligiblesDesignation(membres) {
  return (membres || []).filter(
    (m) => m.actif !== false && m.role !== 'admin' && m.role !== 'etudiant',
  )
}

function PersonCard({ person, emptyLabel }) {
  if (!person) {
    return <p className="text-sm text-gray-500 mt-1">{emptyLabel}</p>
  }
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="w-10 h-10 rounded-full bg-teal-500 text-white font-bold text-sm flex items-center justify-center">
        {(person.prenom?.[0] || '?')}{(person.nom?.[0] || '')}
      </div>
      <div>
        <p className="font-semibold text-gray-800">{person.prenom} {person.nom}</p>
        <p className="text-xs text-gray-400">
          {person.email} · {ROLE_LABELS[person.role] || person.role}
        </p>
      </div>
    </div>
  )
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
          {etab.logo_url && <img src={mediaUrl(etab.logo_url)} alt="logo" className="w-20 h-20 object-contain border rounded-xl mb-2 p-1 bg-gray-50" />}
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

export function TabFormations({ etabId, formations: init, filieres, onRefreshFilieres, onRefreshFormations }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isFadStaff = user?.role === 'responsable_fad' || user?.role === 'agent_fad'
  const isPresentielStaff = user?.role === 'responsable'
  const lockedType = isFadStaff ? 'en_ligne' : isPresentielStaff ? 'presentiel' : null
  const [formations, setFormations] = useState(() => (Array.isArray(init) ? init : []))
  const [niveaux, setNiveaux] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtreFiliere, setFiltreFiliere] = useState('')
  const [filtreType, setFiltreType] = useState(lockedType || '')
  const [filtreNiveau, setFiltreNiveau] = useState('')
  const [searchText, setSearchText] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importDryRun, setImportDryRun] = useState(true)
  const [importResult, setImportResult] = useState(null)
  const [importMode, setImportMode] = useState(lockedType || 'presentiel') // presentiel | en_ligne
  const [showExcelGrid, setShowExcelGrid] = useState(false)
  const [excelGridVariant, setExcelGridVariant] = useState('create') // create | edit
  const [excelEditRows, setExcelEditRows] = useState([])
  const [excelSaving, setExcelSaving] = useState(false)
  const EMPTY = {
    filiere_id: '', titre: '', type: lockedType || 'presentiel', niveau: '', niveau_requis: '', duree: '', description: '', debouches: '',
    frais_inscription: '', mensualite: '', duree_mois: '', frais_soutenance: '',
    frais_bibliotheque: '', frais_epi: '', autres_frais: '0',
    frais_supplementaires: [],
    libelles_champs: {},
    nombre_photos_preinscription: '1',
  }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [hardDeleteModal, setHardDeleteModal] = useState(null)
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    if (init !== undefined) setFormations(Array.isArray(init) ? init : [])
  }, [init])

  useEffect(() => {
    axios
      .get('/api/niveaux-etude')
      .then(({ data }) => setNiveaux(Array.isArray(data) ? data : []))
      .catch(() => setNiveaux([]))
  }, [])

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
      debouches: f.debouches || '',
      frais_inscription: String(f.frais_inscription || ''),
      mensualite: String(f.mensualite || ''),
      duree_mois: String(f.duree_mois ?? ''),
      frais_soutenance: String(f.frais_soutenance || ''),
      frais_bibliotheque: String(f.frais_bibliotheque || ''),
      frais_epi: String(f.frais_epi || ''),
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
        type: lockedType || form.type,
        niveau: form.niveau,
        niveau_requis: form.niveau_requis,
        duree: form.duree || dureeLabelFromMois(form.duree_mois),
        description: form.description,
        debouches: form.debouches || '',
        ville: null,
        places: 0,
        frais_inscription: parseInt(form.frais_inscription, 10) || 0,
        mensualite: parseInt(form.mensualite, 10) || 0,
        duree_mois: parseInt(form.duree_mois, 10) || 0,
        frais_supplementaires: normalizeFraisSuppFromForm(form.frais_supplementaires),
        frais_soutenance: parseInt(form.frais_soutenance, 10) || 0,
        frais_bibliotheque: parseInt(form.frais_bibliotheque, 10) || 0,
        frais_epi: parseInt(form.frais_epi, 10) || 0,
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
    const byNiveau = !filtreNiveau || String(f.niveau || '') === filtreNiveau
    if (!searchNorm) return byFiliere && byType && byNiveau
    const haystack = [
      f.titre,
      f.niveau,
      f.niveau_requis,
      f.filiere_nom,
      f.type === 'en_ligne' ? 'fad' : 'presentiel',
    ].filter(Boolean).join(' ').toLowerCase()
    return byFiliere && byType && byNiveau && haystack.includes(searchNorm)
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

  const openBatchEdit = () => {
    const rows = formations
      .filter((f) => selectedIds.includes(f.id))
      .map((f) => formationToGridRow(f))
    if (rows.length === 0) {
      toast.error('Aucune formation sélectionnée.')
      return
    }
    setExcelEditRows(rows)
    setExcelGridVariant('edit')
    setShowExcelGrid(true)
  }

  const openCreateGrid = () => {
    if (filieres.length === 0) {
      toast.error('Créez d’abord une filière.')
      return
    }
    setExcelEditRows([])
    setExcelGridVariant('create')
    setShowExcelGrid(true)
  }

  const handleExcelGridSubmit = async (payload) => {
    setExcelSaving(true)
    try {
      const { data } = await axios.put(`/api/etablissements/${etabId}/formations/batch`, {
        items: payload,
      })
      const errs = Array.isArray(data.errors) ? data.errors : []
      if (errs.length > 0) {
        toast.error(
          `${data.message || 'Traitement partiel.'} — ${errs.length} ligne(s) en erreur.`,
          { duration: 6000 }
        )
        return
      }
      await onRefreshFilieres?.()
      await onRefreshFormations?.()
      toast.success(data.message || (excelGridVariant === 'edit'
        ? 'Modifications par lot enregistrées.'
        : 'Formations enregistrées.'))
      setShowExcelGrid(false)
      setExcelEditRows([])
      if (excelGridVariant === 'edit') clearSelection()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l’enregistrement.')
    } finally {
      setExcelSaving(false)
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

  const downloadTemplate = async (mode) => {
    const m = mode === 'en_ligne' ? 'en_ligne' : 'presentiel'
    try {
      const columns = templateColumnsFromState(loadColumnState(etabId))
      const { data } = await axios.get(`/api/etablissements/${etabId}/formations/template.xlsx`, {
        params: { type: m, columns: JSON.stringify(columns) },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }))
      const a = document.createElement('a')
      a.href = url
      a.setAttribute('download', `template-formations-${m}.xlsx`)
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Template Excel ${m === 'en_ligne' ? 'en ligne' : 'présentiel'} téléchargé.`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de télécharger le template Excel.')
    }
  }

  const handleImport = async () => {
    if (!selectedFiliereId) {
      toast.error('Sélectionnez une filière avant l’import.')
      return
    }
    if (!importMode) {
      toast.error('Choisissez le mode : présentiel ou en ligne.')
      return
    }
    if (!importFile) {
      toast.error('Choisissez un fichier Excel (.xlsx).')
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const columns = templateColumnsFromState(loadColumnState(etabId))
      const fd = new FormData()
      fd.append('file', importFile)
      const { data } = await axios.post(
        `/api/etablissements/${etabId}/formations/import/${selectedFiliereId}?dry_run=${importDryRun}&type=${importMode}&columns=${encodeURIComponent(JSON.stringify(columns))}`,
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
      toast.error(payload?.message || 'Erreur pendant l’import Excel')
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
            Filtrez par filière et recherchez par intitulé. Sélectionnez des lignes pour les actions par lot ou importez un fichier Excel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            disabled={filieres.length === 0}
            title={filieres.length === 0 ? 'Créez d’abord une filière' : 'Importer un lot Excel pour la filière sélectionnée'}
          >
            Import Excel
          </button>
          <button
            type="button"
            onClick={openCreateGrid}
            className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            disabled={filieres.length === 0}
            title={filieres.length === 0 ? 'Créez d’abord une filière' : 'Saisir plusieurs formations dans une grille type Excel'}
          >
            <FaLayerGroup className="h-3.5 w-3.5" aria-hidden />
            Ajouter via grille
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
            <select
              className="input-field min-w-[160px] rounded-xl border-slate-200 bg-white py-2 text-sm shadow-sm"
              value={filtreNiveau}
              onChange={(e) => setFiltreNiveau(e.target.value)}
            >
              <option value="">Tous les niveaux</option>
              {niveaux.map((n) => (
                <option key={n.id || n.libelle} value={n.libelle}>{n.libelle}</option>
              ))}
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

      {(filtreFiliere || filtreType || filtreNiveau || searchNorm) && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          Filtre actif
          <button
            type="button"
            className="underline"
            onClick={() => { setFiltreFiliere(''); setFiltreType(''); setFiltreNiveau(''); setSearchText('') }}
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
                    {(f.duree || f.duree_mois > 0) && (
                      <span>⏱ {f.duree || dureeLabelFromMois(f.duree_mois)}</span>
                    )}
                    {f.niveau_requis && <span>📋 {f.niveau_requis}</span>}
                  </div>
                  {/* Tarifs */}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      { l: 'Inscription', v: f.frais_inscription },
                      { l: 'Mensualité', v: f.mensualite },
                      { l: 'Durée (mois)', v: f.duree_mois },
                      { l: 'Total mensualités', v: computeTotalMensualites(f.mensualite, f.duree_mois) },
                      { l: 'Scolarité annuelle', v: f.prix },
                      { l: 'Soutenance', v: f.frais_soutenance },
                      { l: 'Bibliothèque', v: f.frais_bibliotheque },
                      { l: 'EPI', v: f.frais_epi },
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
                  <select
                    className="input-field"
                    value={lockedType || form.type}
                    onChange={up('type')}
                    disabled={!!lockedType}
                    required
                  >
                    {(!lockedType || lockedType === 'presentiel') && (
                      <option value="presentiel">🏫 Présentiel</option>
                    )}
                    {(!lockedType || lockedType === 'en_ligne') && (
                      <option value="en_ligne">🌐 Formation à distance (FAD)</option>
                    )}
                  </select>
                </div>
                <div>
                  <L>Niveau *</L>
                  <select className="input-field" value={form.niveau} onChange={up('niveau')} required>
                    <option value="">-- Sélectionner --</option>
                    {niveaux.map((n) => (
                      <option key={n.id || n.libelle} value={n.libelle}>{n.libelle}</option>
                    ))}
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
                  <input
                    className="input-field bg-gray-50"
                    value={form.duree || dureeLabelFromMois(form.duree_mois)}
                    readOnly
                    placeholder="Calculé depuis le nombre de mois"
                  />
                </div>
                <div>
                  <L>Nombre de mois *</L>
                  <input
                    className="input-field"
                    type="number"
                    min="1"
                    max="120"
                    value={form.duree_mois}
                    onChange={up('duree_mois')}
                    placeholder="Ex: 10"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Total mensualités = mois × mensualité.</p>
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
                <div className="col-span-2">
                  <L>Description</L>
                  <textarea className="input-field" rows={2} value={form.description} onChange={up('description')} placeholder="Présentation de la formation (contenu pédagogique, objectifs…)" />
                </div>
                <div className="col-span-2">
                  <L>Débouchés professionnels</L>
                  <textarea className="input-field" rows={2} value={form.debouches || ''} onChange={up('debouches')} placeholder="Métiers et secteurs accessibles après la formation…" />
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
                        { f: 'frais_bibliotheque', l: 'Bibliothèque' },
                        { f: 'frais_epi', l: 'EPI' },
                      ].map(({ f, l }) => (
                        <div key={f}>
                          <L>{l}</L>
                          <input className="input-field" type="number" min="0" value={form[f]} onChange={up(f)} placeholder="0" />
                        </div>
                      ))}
                      <div>
                        <L>Total mensualités (calculé)</L>
                        <div className="input-field bg-gray-100 text-gray-900 font-semibold">
                          {fmt(computeTotalMensualites(form.mensualite, form.duree_mois))} FCFA
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <L>Scolarité annuelle (calculée)</L>
                        <div className="input-field bg-gray-100 text-gray-900 font-semibold">
                          {fmt(computeScolariteAnnuelle(form.frais_inscription, form.mensualite, form.duree_mois))} FCFA
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-blue-100 pt-3 mt-2">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Autres postes tarifaires (désignation libre)</p>
                      <p className="text-xs text-blue-800/80 mb-2">
                        Chaque ligne porte le libellé que vous choisissez — repris tel quel sur les factures (aucun titre générique).
                      </p>
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

      {/* Modal import lot Excel */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Import de formations par lot (Excel)</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <L>Filière ciblée *</L>
                  <select
                    className="input-field"
                    value={filtreFiliere}
                    onChange={(e) => setFiltreFiliere(e.target.value)}
                  >
                    <option value="">— Sélectionner —</option>
                    {filieres.map((f) => (
                      <option key={f.id} value={String(f.id)}>{f.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <L>Mode du template *</L>
                  <div className="flex gap-1 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200">
                    {[
                      { val: 'presentiel', label: 'Présentiel' },
                      { val: 'en_ligne', label: 'En ligne' },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setImportMode(val)}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                          importMode === val ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {!selectedFiliereId && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Sélectionnez une filière et le mode (présentiel ou en ligne) pour synchroniser l’import.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => downloadTemplate('presentiel')} className="text-sm text-blue-600 hover:underline">
                    Template Excel présentiel (.xlsx)
                  </button>
                  <button type="button" onClick={() => downloadTemplate('en_ligne')} className="text-sm text-emerald-700 hover:underline">
                    Template Excel en ligne (.xlsx)
                  </button>
                </div>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input type="checkbox" checked={importDryRun} onChange={(e) => setImportDryRun(e.target.checked)} />
                  Mode test (dry-run)
                </label>
              </div>

              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="input-field"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />

              <p className="text-xs text-gray-500">
                Fichier Excel soigné (pas CSV) : mêmes colonnes que la grille
                (« Nom de la formation », Niveau, Niveau requis, Nombre de mois, Inscription, Mensualité,
                Soutenance, Bibliothèque, EPI, Description, Actif).
                Les titres renommés ou colonnes masquées dans la grille sont répercutés dans le template téléchargé.
                Total des mensualités = mois × mensualité (calculé automatiquement).
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
                  {importing ? 'Traitement...' : (importDryRun ? 'Valider Excel' : 'Importer le lot')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FormationExcelGrid
        open={showExcelGrid}
        onClose={() => { setShowExcelGrid(false); setExcelEditRows([]) }}
        etabId={etabId}
        filieres={filieres}
        initialFiliereId={filtreFiliere || (filieres[0] ? String(filieres[0].id) : '')}
        initialType={filtreType === 'en_ligne' ? 'en_ligne' : 'presentiel'}
        variant={excelGridVariant}
        initialRows={excelGridVariant === 'edit' ? excelEditRows : null}
        onSubmit={handleExcelGridSubmit}
        saving={excelSaving}
      />
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

export function TabMembres({ etabId, membres: init, responsable_id, admin_etablissement_id, onEtabRefresh }) {
  const { user } = useAuth()
  const isPlatformAdmin = user?.role === 'admin'
  const canCreateStaffAccount = userCanCreateStaff(user)
  const canDeleteStaffPermanently = isPlatformAdmin
  const roleOptions = useMemo(() => creatableRoleOptions(user), [user])
  const roleOptionsAll = useMemo(
    () => [...roleOptions, { val: 'admin_etablissement', label: 'Administrateur établissement' }],
    [roleOptions],
  )
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
      onEtabRefresh?.()
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
      onEtabRefresh?.()
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
              Gérez les rôles, l’identité et l’état des comptes staff. Les étudiants ne sont pas listés ici.
              {user?.role === 'admin_etablissement' && (
                <span className="mt-1 block text-cyan-100/90">
                  Vous pouvez créer, modifier et désactiver les comptes staff de votre établissement.
                </span>
              )}
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
          {canCreateStaffAccount && (
            <button
              type="button"
              onClick={() => { setShowForm(true); setForm(EMPTY_MEMBRE_FORM) }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
            >
              <FaPlus className="h-4 w-4" aria-hidden />
              Ajouter un membre
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(m => {
            const manageable = canManageMembre(user, m)
            const isSelf = Number(user?.id) === Number(m.id)
            return (
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
                      {roleLabel(m.role, roleOptionsAll)}
                    </span>
                    {m.id === responsable_id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                        <FaUserTie className="h-3 w-3" aria-hidden />
                        Resp. pédagogique
                      </span>
                    )}
                    {m.id === admin_etablissement_id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800 ring-1 ring-indigo-200">
                        Admin étab.
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
                {isSelf && user?.role === 'admin_etablissement' && (
                  <p className="w-full text-xs text-slate-500">Votre propre compte ne peut pas être modifié ici.</p>
                )}
                {manageable && (
                  <>
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
                  </>
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
            )
          })}
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
                  {roleOptions.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
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
                    Cette personne est le <strong>responsable désigné</strong>. Si vous changez son rôle, vérifiez l’onglet « Responsable » pour désigner un autre responsable pédagogique.
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
                  {(roleOptions.some(r => r.val === editForm.role) ? roleOptions : [...roleOptions, { val: editForm.role, label: roleLabel(editForm.role, roleOptionsAll) }]).map(r => (
                    <option key={r.val} value={r.val}>{r.label}</option>
                  ))}
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

      {(user?.role === 'admin_etablissement' || user?.role === 'admin') && (
        <DonneesBackupPanel className="mt-2" />
      )}
    </div>
  )
}
// ═══════════════════════════════════════════════════════════════════════
// Onglet — Responsables & administrateur établissement
// ═══════════════════════════════════════════════════════════════════════
function TabResponsable({
  etabId,
  responsable: initResp,
  adminEtab: initAdmin,
  membres,
  onUpdated,
  isPlatformAdmin,
}) {
  const [responsable, setResponsable] = useState(initResp)
  const [adminEtab, setAdminEtab] = useState(initAdmin)
  const [selectedRespId, setSelectedRespId] = useState(initResp?.id ? String(initResp.id) : '')
  const [selectedAdminId, setSelectedAdminId] = useState(initAdmin?.id ? String(initAdmin.id) : '')
  const [savingResp, setSavingResp] = useState(false)
  const [savingAdmin, setSavingAdmin] = useState(false)

  const eligibles = staffEligiblesDesignation(membres)

  useEffect(() => {
    setResponsable(initResp)
    setSelectedRespId(initResp?.id ? String(initResp.id) : '')
  }, [initResp])

  useEffect(() => {
    setAdminEtab(initAdmin)
    setSelectedAdminId(initAdmin?.id ? String(initAdmin.id) : '')
  }, [initAdmin])

  const refreshEtab = async () => {
    const { data } = await axios.get(`/api/etablissements/${etabId}`)
    setResponsable(data.responsable || null)
    setAdminEtab(data.admin_etablissement || null)
    setSelectedRespId(data.responsable?.id ? String(data.responsable.id) : '')
    setSelectedAdminId(data.admin_etablissement?.id ? String(data.admin_etablissement.id) : '')
    onUpdated?.(data)
    return data
  }

  const handleSaveResp = async () => {
    setSavingResp(true)
    try {
      await axios.put(`/api/etablissements/${etabId}/responsable`, { utilisateur_id: selectedRespId || null })
      await refreshEtab()
      toast.success(selectedRespId ? 'Responsable pédagogique désigné.' : 'Responsable pédagogique retiré.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSavingResp(false) }
  }

  const handleSaveAdmin = async () => {
    setSavingAdmin(true)
    try {
      const { data } = await axios.put(`/api/etablissements/${etabId}/admin-etablissement`, {
        utilisateur_id: selectedAdminId || null,
      })
      await refreshEtab()
      toast.success(data.message || (selectedAdminId ? 'Administrateur désigné.' : 'Administrateur retiré.'))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSavingAdmin(false) }
  }

  const renderDesignationBlock = ({
    title,
    hint,
    current,
    emptyLabel,
    selectedId,
    setSelectedId,
    onSave,
    saving,
    cardClass,
  }) => (
    <div className="space-y-4">
      <div className={`card ${cardClass}`}>
        <p className="font-semibold mb-1">{title}</p>
        <PersonCard person={current} emptyLabel={emptyLabel} />
      </div>
      <div>
        <p className="font-semibold text-gray-800 mb-1">Changer la désignation</p>
        <p className="text-xs text-gray-500 mb-3">{hint}</p>
        {eligibles.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl text-sm text-amber-700">
            ⚠ Ajoutez d&apos;abord un membre du staff actif (onglet <strong>Membres</strong>).
          </div>
        ) : (
          <>
            <select className="input-field mb-4" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">-- Aucune désignation --</option>
              {eligibles.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.prenom} {m.nom} ({ROLE_LABELS[m.role] || m.role})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-40"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
              Enregistrer
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-10">
      {isPlatformAdmin && renderDesignationBlock({
        title: 'Administrateur établissement',
        hint: 'Gère le staff et l’établissement. Un seul administrateur à la fois — l’ancien est rétrogradé automatiquement.',
        current: adminEtab,
        emptyLabel: 'Aucun administrateur établissement désigné.',
        selectedId: selectedAdminId,
        setSelectedId: setSelectedAdminId,
        onSave: handleSaveAdmin,
        saving: savingAdmin,
        cardClass: 'bg-indigo-50 border-indigo-100',
      })}

      {renderDesignationBlock({
        title: 'Responsable pédagogique',
        hint: 'Droits pédagogiques (dossiers, proforma, etc.) en plus de son rôle principal. Tout membre staff actif peut être désigné.',
        current: responsable,
        emptyLabel: 'Aucun responsable pédagogique désigné.',
        selectedId: selectedRespId,
        setSelectedId: setSelectedRespId,
        onSave: handleSaveResp,
        saving: savingResp,
        cardClass: 'bg-blue-50 border-blue-100',
      })}
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
  { id: 'responsable', label: 'Responsables', Icon: FaUserTie },
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
                  <img src={mediaUrl(etab.logo_url)} alt="" className="w-full h-full object-contain p-1" />
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
          <TabMembres
            etabId={etab.id}
            membres={etab.membres || []}
            responsable_id={etab.responsable_id}
            admin_etablissement_id={etab.admin_etablissement_id}
            onEtabRefresh={load}
          />
        )}
        {tab === 'responsable' && (
          <TabResponsable
            etabId={etab.id}
            responsable={etab.responsable}
            adminEtab={etab.admin_etablissement}
            membres={etab.membres || []}
            isPlatformAdmin={user?.role === 'admin'}
            onUpdated={(data) => setEtab((prev) => (prev ? { ...prev, ...data } : data))}
          />
        )}
          </div>
        </div>
      </div>
    </main>
  )
}
