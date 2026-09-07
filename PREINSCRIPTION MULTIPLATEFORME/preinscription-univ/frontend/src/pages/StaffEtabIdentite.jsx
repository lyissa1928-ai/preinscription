import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaTrashAlt } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'
import { DashboardPage } from '../components/dashboard/DashboardChrome'

const TYPES_ETAB = [
  { val: 'sante', label: 'Santé' },
  { val: 'btp', label: 'BTP' },
  { val: 'gestion', label: 'Gestion' },
]

const L = ({ children }) => (
  <label className="mb-1 block text-sm font-semibold text-gray-700">{children}</label>
)

const FAD_FIELDS = [
  'adresse_fad', 'telephone_fad', 'email_contact_fad',
  'banque_fad', 'compte_bancaire_fad', 'iban_fad', 'swift_fad',
]

const PRESENTIEL_FIELDS = [
  'nom', 'type', 'description', 'couleur_primaire', 'couleur_secondaire',
  'adresse', 'telephone', 'email_contact', 'site_web',
  'ninea', 'rc', 'arrete', 'compte_bancaire',
  'banque', 'iban', 'swift', 'signataire_nom', 'signataire_fonction',
]

function SectionHeading({ children }) {
  return (
    <h2 className="border-b border-slate-200 pb-2 text-base font-bold text-slate-900">{children}</h2>
  )
}

/**
 * Identité établissement — admin établissement (complet) ou responsable FAD (coordonnées FAD uniquement).
 */
export default function StaffEtabIdentite() {
  const { user, refreshUser } = useAuth()
  const isFadOnly = user?.role === 'responsable_fad'
  const administered = user?.etablissements_administres?.length
    ? user.etablissements_administres
    : user?.etablissement_id
      ? [{ id: user.etablissement_id, nom: user.etablissement_nom || 'Mon établissement' }]
      : []
  const [etabId, setEtabId] = useState(() => administered[0]?.id || user?.etablissement_id || '')
  const [etab, setEtab] = useState(null)
  const [form, setForm] = useState({})
  const [logo, setLogo] = useState(null)
  const [cachet, setCachet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removingMedia, setRemovingMedia] = useState(null)

  const up = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const removeMedia = async (kind) => {
    if (!etab?.id || removingMedia || isFadOnly) return
    if (!window.confirm(kind === 'logo' ? 'Supprimer le logo ?' : 'Supprimer le cachet ?')) return
    setRemovingMedia(kind)
    try {
      const { data } = await axios.delete(`/api/etablissements/${etab.id}/media/${kind}`)
      toast.success(data.message || 'Supprimé.')
      setEtab((prev) => ({ ...prev, ...data }))
      if (kind === 'logo') setLogo(null)
      if (kind === 'cachet') setCachet(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suppression impossible.')
    } finally {
      setRemovingMedia(null)
    }
  }

  const load = (id) => {
    if (!id) return
    setLoading(true)
    axios
      .get(`/api/etablissements/${id}`)
      .then(({ data }) => {
        setEtab(data)
        setForm({ ...data })
      })
      .catch(() => toast.error('Impossible de charger l’établissement.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (etabId) load(etabId)
  }, [etabId])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!etabId) return
    setSaving(true)
    try {
      const fields = isFadOnly ? FAD_FIELDS : [...PRESENTIEL_FIELDS, ...FAD_FIELDS]
      const payload = {}
      fields.forEach((f) => { payload[f] = form[f] || '' })
      const { data } = await axios.put(`/api/etablissements/${etabId}`, payload)
      if (!isFadOnly && (logo || cachet)) {
        const fd = new FormData()
        if (logo) fd.append('logo', logo)
        if (cachet) fd.append('cachet', cachet)
        const { data: withFiles } = await axios.post(`/api/etablissements/${etabId}/upload`, fd)
        setEtab(withFiles)
        setForm({ ...withFiles })
        setLogo(null)
        setCachet(null)
        toast.success('Identité et fichiers mis à jour.')
      } else {
        setEtab(data)
        setForm({ ...data })
        toast.success(isFadOnly ? 'Coordonnées FAD mises à jour.' : 'Identité mise à jour.')
      }
      refreshUser?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setSaving(false)
    }
  }

  if (!user?.etablissement_id && !administered.length) {
    return (
      <DashboardPage>
        <p className="text-slate-500">Aucun établissement rattaché.</p>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage maxWidthClass="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-slate-900">
            {isFadOnly ? 'Coordonnées FAD' : 'Identité de l’établissement'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isFadOnly
              ? 'Adresse, contacts et coordonnées bancaires pour la formation à distance.'
              : 'Logo, contacts présentiel et FAD, conformité et coordonnées bancaires.'}
          </p>
        </div>
        <Link to="/mon-etablissement" className="shrink-0 text-sm font-semibold text-blue-700 hover:underline">
          ← Mon établissement
        </Link>
      </div>

      {administered.length > 1 && !isFadOnly && (
        <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/80 p-4">
          <L>Établissement à modifier</L>
          <select
            className="input-field max-w-md"
            value={etabId}
            onChange={(e) => setEtabId(Number(e.target.value) || e.target.value)}
          >
            {administered.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}{e.type ? ` (${e.type})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading || !etab ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!isFadOnly && (
            <section className="space-y-4">
              <SectionHeading>Informations générales</SectionHeading>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <L>Nom de l&apos;établissement *</L>
                  <input className="input-field" value={form.nom || ''} onChange={up('nom')} required />
                </div>
                <div>
                  <L>Type / Secteur</L>
                  <select className="input-field" value={form.type || ''} onChange={up('type')}>
                    {TYPES_ETAB.map((t) => (
                      <option key={t.val} value={t.val}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <L>Description</L>
                  <textarea className="input-field" rows={3} value={form.description || ''} onChange={up('description')} />
                </div>
                <div>
                  <L>Couleur principale</L>
                  <div className="flex items-center gap-3">
                    <input type="color" className="h-10 w-10 cursor-pointer rounded border" value={form.couleur_primaire || '#1e40af'} onChange={up('couleur_primaire')} />
                    <input className="input-field min-w-0 flex-1" value={form.couleur_primaire || ''} onChange={up('couleur_primaire')} />
                  </div>
                </div>
                <div>
                  <L>Couleur secondaire</L>
                  <div className="flex items-center gap-3">
                    <input type="color" className="h-10 w-10 cursor-pointer rounded border" value={form.couleur_secondaire || '#3b82f6'} onChange={up('couleur_secondaire')} />
                    <input className="input-field min-w-0 flex-1" value={form.couleur_secondaire || ''} onChange={up('couleur_secondaire')} />
                  </div>
                </div>
                <div>
                  <L>Logo</L>
                  {etab.logo_url ? (
                    <div className="group relative mb-2 inline-block">
                      <img src={mediaUrl(etab.logo_url)} alt="" className="h-20 w-20 rounded-xl border bg-gray-50 object-contain p-1" />
                      <button type="button" title="Supprimer le logo" disabled={removingMedia === 'logo'} onClick={() => removeMedia('logo')} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100 disabled:opacity-50">
                        <FaTrashAlt className="text-xs" />
                      </button>
                    </div>
                  ) : null}
                  <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={(e) => setLogo(e.target.files[0])} className="block w-full min-w-0 text-sm" />
                </div>
                <div>
                  <L>Cachet officiel</L>
                  {etab.cachet_url ? (
                    <div className="group relative mb-2 inline-block">
                      <img src={mediaUrl(etab.cachet_url)} alt="" className="h-20 w-20 rounded-xl border bg-gray-50 object-contain p-1" />
                      <button type="button" title="Supprimer le cachet" disabled={removingMedia === 'cachet'} onClick={() => removeMedia('cachet')} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100 disabled:opacity-50">
                        <FaTrashAlt className="text-xs" />
                      </button>
                    </div>
                  ) : null}
                  <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setCachet(e.target.files[0])} className="block w-full min-w-0 text-sm" />
                </div>
              </div>
            </section>
          )}

          {!isFadOnly && (
            <section className="space-y-4">
              <SectionHeading>Coordonnées présentiel</SectionHeading>
              <div className="grid gap-4 md:grid-cols-2">
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
                  <input className="input-field" value={form.ninea || ''} onChange={up('ninea')} />
                </div>
                <div>
                  <L>RC</L>
                  <input className="input-field" value={form.rc || ''} onChange={up('rc')} />
                </div>
                <div className="md:col-span-2">
                  <L>Arrêté d&apos;autorisation</L>
                  <input className="input-field" value={form.arrete || ''} onChange={up('arrete')} />
                </div>
                <div>
                  <L>Banque</L>
                  <input className="input-field" value={form.banque || ''} onChange={up('banque')} />
                </div>
                <div>
                  <L>Compte / IBAN</L>
                  <input className="input-field" value={form.compte_bancaire || ''} onChange={up('compte_bancaire')} />
                </div>
                <div>
                  <L>IBAN</L>
                  <input className="input-field" value={form.iban || ''} onChange={up('iban')} />
                </div>
                <div>
                  <L>SWIFT</L>
                  <input className="input-field" value={form.swift || ''} onChange={up('swift')} />
                </div>
                <div>
                  <L>Nom du signataire</L>
                  <input className="input-field" value={form.signataire_nom || ''} onChange={up('signataire_nom')} />
                </div>
                <div>
                  <L>Fonction du signataire</L>
                  <input className="input-field" value={form.signataire_fonction || ''} onChange={up('signataire_fonction')} />
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <SectionHeading>Coordonnées FAD (formation à distance)</SectionHeading>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <L>Adresse FAD</L>
                <input className="input-field" value={form.adresse_fad || ''} onChange={up('adresse_fad')} />
              </div>
              <div>
                <L>Téléphone FAD</L>
                <input className="input-field" value={form.telephone_fad || ''} onChange={up('telephone_fad')} />
              </div>
              <div>
                <L>Email contact FAD</L>
                <input className="input-field" type="email" value={form.email_contact_fad || ''} onChange={up('email_contact_fad')} />
              </div>
              <div>
                <L>Banque FAD</L>
                <input className="input-field" value={form.banque_fad || ''} onChange={up('banque_fad')} placeholder="Optionnel" />
              </div>
              <div>
                <L>Compte bancaire FAD</L>
                <input className="input-field" value={form.compte_bancaire_fad || ''} onChange={up('compte_bancaire_fad')} placeholder="Optionnel" />
              </div>
              <div>
                <L>IBAN FAD</L>
                <input className="input-field" value={form.iban_fad || ''} onChange={up('iban_fad')} placeholder="Optionnel" />
              </div>
              <div>
                <L>SWIFT FAD</L>
                <input className="input-field" value={form.swift_fad || ''} onChange={up('swift_fad')} placeholder="Optionnel" />
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto disabled:opacity-40">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </DashboardPage>
  )
}
