import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaCamera } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { DashboardPage, Panel } from '../components/dashboard/DashboardChrome'
import DonneesBackupPanel from '../components/DonneesBackupPanel'
import { mediaUrl } from '../utils/mediaUrl'

const ROLE_LABELS = {
  admin: 'Administrateur plateforme',
  directeur: 'Directeur',
  admin_etablissement: 'Administrateur établissement',
  responsable: 'Responsable pédagogique',
  responsable_fad: 'Responsable FAD',
  agent_fad: 'Agent FAD',
  agent_admin: 'Agent administratif',
  comptable: 'Comptable',
  controleur_qualite: 'Contrôleur qualité',
  etudiant: 'Étudiant',
}

export default function ProfilPage() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    adresse: '',
    date_naissance: '',
    service: '',
  })
  const [pwd, setPwd] = useState({ ancien: '', nouveau: '', confirmation: '' })
  const [saving, setSaving] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      prenom: user.prenom || '',
      nom: user.nom || '',
      telephone: user.telephone || '',
      adresse: user.adresse || '',
      date_naissance: user.date_naissance ? String(user.date_naissance).slice(0, 10) : '',
      service: user.service || user.fonction || '',
    })
  }, [user])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await axios.put('/api/auth/profil', form)
      toast.success(data.message || 'Profil mis à jour')
      await refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwdSaving(true)
    try {
      const { data } = await axios.put('/api/auth/mot-de-passe', {
        ancien_mot_de_passe: pwd.ancien,
        nouveau_mot_de_passe: pwd.nouveau,
        confirmation: pwd.confirmation,
      })
      toast.success(data.message || 'Mot de passe mis à jour')
      setPwd({ ancien: '', nouveau: '', confirmation: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Changement impossible')
    } finally {
      setPwdSaving(false)
    }
  }

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      await axios.post('/api/auth/profil/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Photo mise à jour')
      await refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload impossible')
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  if (!user) return null

  const initials = `${(user.prenom || '?')[0]}${(user.nom || '?')[0]}`.toUpperCase()
  const isStaff = user.role !== 'etudiant'
  const photoSrc = user.photo_url ? mediaUrl(user.photo_url) : null

  return (
    <DashboardPage className="!py-5 md:!py-6" maxWidthClass="max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-xl font-black text-white shadow-lg">
            {photoSrc ? (
              <img src={photoSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50">
            <FaCamera className="text-xs" aria-hidden />
            <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} disabled={photoUploading} />
          </label>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mon profil</h1>
          <p className="text-sm text-slate-500">
            {ROLE_LABELS[user.role] || user.role}
            {user.etablissement_nom ? ` · ${user.etablissement_nom}` : ''}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {photoUploading ? 'Envoi de la photo…' : 'Photo et informations personnelles modifiables à tout moment.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Panel title="Identité du compte" bodyClassName="p-5">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">E-mail</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 break-all">{user.email}</dd>
              </div>
              {isStaff && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Matricule</dt>
                  <dd className="mt-0.5 font-mono text-sm font-bold text-orange-700">{user.matricule || '—'}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rôle</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{ROLE_LABELS[user.role] || user.role}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Statut</dt>
                <dd className="mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${user.actif !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                    {user.actif !== false ? 'Actif' : 'Désactivé'}
                  </span>
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Informations personnelles" bodyClassName="p-5">
            <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Prénom</label>
                <input className="input-field" value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Nom</label>
                <input className="input-field" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Téléphone</label>
                <input className="input-field" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  Date de naissance{!isStaff ? ' *' : ''}
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={form.date_naissance}
                  onChange={(e) => setForm((f) => ({ ...f, date_naissance: e.target.value }))}
                  required={!isStaff}
                />
                {isStaff && <p className="mt-1 text-xs text-slate-400">Facultatif pour le staff</p>}
              </div>
              {isStaff && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-600">Service / fonction</label>
                  <input
                    className="input-field"
                    value={form.service}
                    onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                    placeholder="Ex. Scolarité, Pédagogie…"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600">Adresse</label>
                <textarea className="input-field" rows={2} value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
                </button>
              </div>
            </form>
          </Panel>
        </div>

        <Panel title="Paramètres de connexion" bodyClassName="p-5">
          <form onSubmit={savePassword} className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Mot de passe actuel</label>
              <input
                type="password"
                className="input-field"
                value={pwd.ancien}
                onChange={(e) => setPwd((p) => ({ ...p, ancien: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Nouveau mot de passe</label>
              <input
                type="password"
                className="input-field"
                value={pwd.nouveau}
                onChange={(e) => setPwd((p) => ({ ...p, nouveau: e.target.value }))}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Confirmation</label>
              <input
                type="password"
                className="input-field"
                value={pwd.confirmation}
                onChange={(e) => setPwd((p) => ({ ...p, confirmation: e.target.value }))}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" disabled={pwdSaving} className="btn-primary text-sm disabled:opacity-50">
              {pwdSaving ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
          </form>
        </Panel>
      </div>

      <div className="mt-4">
        <DonneesBackupPanel />
      </div>
    </DashboardPage>
  )
}
