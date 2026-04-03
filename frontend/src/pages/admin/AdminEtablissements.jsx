import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FaSearch,
  FaLayerGroup,
  FaGraduationCap,
  FaUsers,
  FaPlus,
  FaChevronRight,
  FaBuilding,
  FaFilter,
} from 'react-icons/fa'

const TYPES = [
  { val: 'sante',   label: 'Santé', icon: '🏥' },
  { val: 'btp',     label: 'BTP / Génie Civil', icon: '🏗️' },
  { val: 'gestion', label: 'Commerce / Informatique / Administration', icon: '📊' },
]

const TYPE_COLORS = {
  sante:   'bg-red-100 text-red-700',
  btp:     'bg-orange-100 text-orange-700',
  gestion: 'bg-blue-100 text-blue-700',
}

function ModalCreation({ onClose, onCreated }) {
  const [form, setForm] = useState({
    nom: '', type: 'sante', description: '',
    couleur_primaire: '#1e40af', couleur_secondaire: '#3b82f6',
    adresse: '', telephone: '', email_contact: '', site_web: '',
    ninea: '', rc: '', arrete: '', compte_bancaire: '',
    banque: '', iban: '', swift: '', signataire_nom: '', signataire_fonction: ''
  })
  const [files, setFiles] = useState({ logo: null, cachet: null })
  const [saving, setSaving] = useState(false)
  const up = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nom.trim()) { toast.error('Le nom est obligatoire.'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v == null ? '' : String(v)))
      if (files.logo) fd.append('logo', files.logo)
      if (files.cachet) fd.append('cachet', files.cachet)
      const { data } = await axios.post('/api/etablissements', fd)
      toast.success('Établissement créé avec succès.')
      onCreated(data)
    } catch (err) {
      const msg = err.response?.data?.message || `Erreur ${err.response?.status || 'réseau'} : ${err.message}`
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Créer un établissement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          <div>
            <label className="label-field">Nom de l'établissement <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.nom} onChange={up('nom')} required placeholder="Ex: École Supérieure de Santé" />
          </div>

          <div>
            <label className="label-field">Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TYPES.map(t => (
                <label key={t.val} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${form.type === t.val ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                  <input type="radio" name="type" value={t.val} checked={form.type === t.val} onChange={up('type')} className="sr-only" />
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Email de contact</label>
              <input className="input-field" type="email" value={form.email_contact} onChange={up('email_contact')} placeholder="contact@etab.sn" />
            </div>
            <div>
              <label className="label-field">Téléphone <span className="text-gray-400 font-normal">(affiché sur factures / coordonnées)</span></label>
              <input className="input-field" type="tel" value={form.telephone} onChange={up('telephone')} placeholder="+221 77 000 00 00" />
            </div>
            <div>
              <label className="label-field">Couleur principale</label>
              <div className="flex gap-2 items-center">
                <input type="color" className="w-9 h-9 rounded border border-gray-200 cursor-pointer flex-shrink-0" value={form.couleur_primaire} onChange={up('couleur_primaire')} />
                <input className="input-field" value={form.couleur_primaire} onChange={up('couleur_primaire')} />
              </div>
            </div>
            <div>
              <label className="label-field">Couleur secondaire</label>
              <div className="flex gap-2 items-center">
                <input type="color" className="w-9 h-9 rounded border border-gray-200 cursor-pointer flex-shrink-0" value={form.couleur_secondaire} onChange={up('couleur_secondaire')} />
                <input className="input-field" value={form.couleur_secondaire} onChange={up('couleur_secondaire')} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">NINEA</label>
              <input className="input-field" value={form.ninea} onChange={up('ninea')} placeholder="Ex: 00123456 2Z1" />
            </div>
            <div>
              <label className="label-field">RC (Registre Commercial)</label>
              <input className="input-field" value={form.rc} onChange={up('rc')} placeholder="Ex: SN-DKR-2024-B-12345" />
            </div>
            <div className="col-span-2">
              <label className="label-field">Arrêté d'autorisation</label>
              <input className="input-field" value={form.arrete} onChange={up('arrete')} placeholder="Ex: Arrêté n°12345/MEN/DLFC du 01/01/2020" />
            </div>
            <div className="col-span-2">
              <label className="label-field">N° compte bancaire / IBAN <span className="text-gray-400 font-normal">(sur factures proforma)</span></label>
              <input className="input-field" value={form.compte_bancaire} onChange={up('compte_bancaire')} placeholder="Ex: SN28 0001 0001 …" />
            </div>
            <div>
              <label className="label-field">Banque</label>
              <input className="input-field" value={form.banque} onChange={up('banque')} placeholder="Ex: CORIS BANK INTERNATIONAL" />
            </div>
            <div>
              <label className="label-field">IBAN (détaillé)</label>
              <input className="input-field" value={form.iban} onChange={up('iban')} placeholder="Ex: SN21 3010 0100 278242410163" />
            </div>
            <div>
              <label className="label-field">Code SWIFT</label>
              <input className="input-field" value={form.swift} onChange={up('swift')} placeholder="Ex: CORISNDA" />
            </div>
            <div>
              <label className="label-field">Nom du signataire</label>
              <input className="input-field" value={form.signataire_nom} onChange={up('signataire_nom')} placeholder="Ex: Pr. Mamadou DIOP" />
            </div>
            <div className="col-span-2">
              <label className="label-field">Fonction du signataire</label>
              <input className="input-field" value={form.signataire_fonction} onChange={up('signataire_fonction')} placeholder="Ex: Directeur des études" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="label-field">Logo officiel</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.svg,.webp"
                className="input-field text-sm file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-800"
                onChange={e => setFiles(p => ({ ...p, logo: e.target.files?.[0] || null }))}
              />
              {files.logo && <p className="text-xs text-emerald-600 mt-1">✓ {files.logo.name}</p>}
            </div>
            <div>
              <label className="label-field">Cachet officiel</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.svg,.webp"
                className="input-field text-sm file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-800"
                onChange={e => setFiles(p => ({ ...p, cachet: e.target.files?.[0] || null }))}
              />
              {files.cachet && <p className="text-xs text-emerald-600 mt-1">✓ {files.cachet.name}</p>}
            </div>
          </div>
          <p className="text-xs text-gray-500">Formats : JPG, PNG, SVG, WebP — max 5 Mo. Ils apparaissent sur les factures téléchargées / PDF.</p>

          <div>
            <label className="label-field">Adresse du siège</label>
            <input className="input-field" value={form.adresse} onChange={up('adresse')} placeholder="Ville, rue…" />
          </div>

          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={up('description')} placeholder="Présentation de l'établissement..." />
          </div>

          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            💡 Vous pourrez modifier le logo, le cachet et les coordonnées à tout moment dans l’onglet <strong>Identité</strong> de l’établissement.
          </p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
              {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Création...</> : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminEtablissements() {
  const [etablissements, setEtablissements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const load = () => {
    setLoading(true)
    axios.get('/api/etablissements')
      .then(({ data }) => setEtablissements(data))
      .catch(() => toast.error('Erreur de chargement.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreated = (etab) => {
    setShowModal(false)
    setEtablissements(prev => [...prev, { ...etab, nb_filieres: 0, nb_formations: 0, nb_membres: 0 }])
  }

  const handleDeactivate = async (id, nom) => {
    if (!confirm(`Désactiver « ${nom} » ? Les utilisateurs ne pourront plus s’y rattacher.`)) return
    try {
      await axios.delete(`/api/etablissements/${id}`)
      toast.success('Établissement désactivé.')
      setEtablissements(prev => prev.map(e => e.id === id ? { ...e, actif: false } : e))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return etablissements.filter((e) => {
      if (filterType !== 'all' && e.type !== filterType) return false
      if (!q) return true
      return String(e.nom || '').toLowerCase().includes(q)
    })
  }, [etablissements, search, filterType])

  return (
    <main className="min-h-[calc(100vh-3.5rem)] w-full bg-gradient-to-b from-slate-50 via-white to-slate-50/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16 w-full">
        {/* En-tête */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div className="min-w-0">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
            >
              ← Administration
            </Link>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Établissements
              </h1>
              {!loading && etablissements.length > 0 && (search.trim() || filterType !== 'all') && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-700/10">
                  {filtered.length} / {etablissements.length} établissement{etablissements.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-slate-600">
              Gérez vos établissements, filières, formations et membres.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl px-5 py-2.5 shadow-md shadow-blue-500/15 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <FaPlus className="h-4 w-4" aria-hidden />
            Créer un établissement
          </button>
        </div>

        {/* Filtres locaux (aucun appel API supplémentaire) */}
        {!loading && etablissements.length > 0 && (
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom…"
                className="input-field w-full rounded-xl border-slate-200 bg-white pl-10 shadow-sm"
                aria-label="Rechercher un établissement"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <FaFilter className="h-3 w-3" aria-hidden />
                Type
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { val: 'all', label: 'Tous' },
                  ...TYPES.map((t) => ({ val: t.val, label: `${t.icon} ${t.label}` })),
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setFilterType(opt.val)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filterType === opt.val
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grille des établissements */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="h-14 w-14 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-full max-w-[12rem] rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
                <div className="mt-4 h-10 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : etablissements.length === 0 ? (
          <div className="card rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-sm">
            <div className="mb-4 flex justify-center text-6xl" aria-hidden>
              🏫
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">Aucun établissement</h2>
            <p className="mb-6 text-slate-500">Commencez par créer votre premier établissement.</p>
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
              <FaPlus className="h-4 w-4" aria-hidden />
              Créer un établissement
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 py-16 text-center">
            <FaBuilding className="mx-auto mb-3 h-12 w-12 text-slate-300" aria-hidden />
            <p className="font-medium text-slate-700">Aucun résultat pour ces filtres</p>
            <p className="mt-1 text-sm text-slate-500">Modifiez la recherche ou le type.</p>
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
              onClick={() => {
                setSearch('')
                setFilterType('all')
              }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {filtered.map((e) => (
              <article
                key={e.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
                  e.actif
                    ? 'border-slate-200/80 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/50'
                    : 'border-slate-100 opacity-[0.88]'
                }`}
              >
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 ring-1 ring-slate-100">
                      {e.logo_url ? (
                        <img src={e.logo_url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <FaBuilding className="h-7 w-7 text-slate-300" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-slate-900">{e.nom}</h3>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            TYPE_COLORS[e.type] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span aria-hidden>{TYPES.find((t) => t.val === e.type)?.icon}</span>
                          {TYPES.find((t) => t.val === e.type)?.label || e.type}
                        </span>
                        {!e.actif && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                            Désactivé
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Filières', value: e.nb_filieres, Icon: FaLayerGroup },
                      { label: 'Formations', value: e.nb_formations, Icon: FaGraduationCap },
                      { label: 'Membres', value: e.nb_membres, Icon: FaUsers },
                    ].map(({ label, value, Icon }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 px-1 py-2.5 text-center"
                      >
                        <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-slate-400" aria-hidden />
                        <p className="text-lg font-black tabular-nums text-slate-900">{value ?? 0}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-slate-50/90 px-2 py-2">
                    <div
                      className="h-7 w-7 flex-shrink-0 rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                      style={{ background: e.couleur_primaire }}
                      title="Couleur principale"
                    />
                    <div
                      className="h-7 w-7 flex-shrink-0 rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                      style={{ background: e.couleur_secondaire }}
                      title="Couleur secondaire"
                    />
                    <span className="text-xs font-medium text-slate-500">Identité visuelle</span>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 bg-slate-50/40 p-4 sm:flex-row sm:items-stretch">
                  <Link
                    to={`/admin/etablissements/${e.id}`}
                    className="btn-primary inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold shadow-sm transition group-hover:shadow-md"
                  >
                    Gérer
                    <FaChevronRight className="h-3 w-3 opacity-80" aria-hidden />
                  </Link>
                  {e.actif && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(e.id, e.nom)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 sm:max-w-[40%]"
                    >
                      Désactiver
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {showModal && <ModalCreation onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      </div>
    </main>
  )
}
