import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaUserCircle, FaCamera } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import AuthCinematicBackground from '../components/AuthCinematicBackground'
import { getRoleHome } from '../utils/smartBack'
import { mediaUrl } from '../utils/mediaUrl'

export default function StaffProfileCompletion() {
  const { user, loading, login, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    date_naissance: '',
    telephone: '',
    adresse: '',
    service: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      date_naissance: user.date_naissance ? String(user.date_naissance).slice(0, 10) : '',
      telephone: user.telephone || '',
      adresse: user.adresse || '',
      service: user.service || user.fonction || '',
    })
    if (user.photo_url) setPhotoPreview(mediaUrl(user.photo_url))
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/connexion" replace />
  if (user.must_change_password) {
    return <Navigate to="/changer-mot-de-passe-obligatoire" replace />
  }
  if (!user.must_complete_profile) {
    return <Navigate to={getRoleHome(user.role)} replace />
  }

  const onPhotoChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.date_naissance) {
      toast.error('La date de naissance est obligatoire.')
      return
    }
    if (!photoFile && !user.photo_url) {
      toast.error('Ajoutez une photo de profil pour activer le compte.')
      return
    }
    setSaving(true)
    try {
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await axios.post('/api/auth/completer-profil-staff/photo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      const { data } = await axios.post('/api/auth/completer-profil-staff', form)
      if (data.token && data.utilisateur) {
        login(data.token, data.utilisateur, data.refresh_token)
      } else {
        await refreshUser()
      }
      if (data.need_photo) {
        toast.error(data.message || 'Photo encore requise.')
        return
      }
      toast.success(data.message || 'Profil complété')
      navigate(getRoleHome(data.utilisateur?.role || user.role), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de finaliser le profil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8">
      <AuthCinematicBackground showProgressDots={false} />
      <div className="relative z-10 mx-auto w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 border border-white/30 mb-3">
            <FaUserCircle className="text-3xl text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-extrabold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
            Activation du compte
          </h1>
          <p className="mt-2 text-sm text-blue-100/95">
            Complétez votre profil (date de naissance et photo) avant d’utiliser la plateforme.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/40 bg-white/95 p-6 shadow-2xl space-y-4"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-28 w-28 overflow-hidden rounded-full bg-slate-100 ring-2 ring-indigo-200">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <FaCamera className="text-2xl" />
                </div>
              )}
            </div>
            <label className="cursor-pointer text-sm font-semibold text-indigo-700 hover:underline">
              Choisir une photo *
              <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </label>
          </div>

          <div>
            <label className="label-field">Date de naissance *</label>
            <input
              type="date"
              className="input-field"
              required
              value={form.date_naissance}
              onChange={(e) => setForm((f) => ({ ...f, date_naissance: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-field">Téléphone</label>
            <input
              type="tel"
              className="input-field"
              value={form.telephone}
              onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-field">Adresse</label>
            <input
              className="input-field"
              value={form.adresse}
              onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-field">Service / fonction</label>
            <input
              className="input-field"
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
              placeholder="Ex. Scolarité, Pédagogie…"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full h-11 disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Valider et accéder'}
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-600 hover:underline"
            onClick={async () => {
              await logout()
              navigate('/', { replace: true })
            }}
          >
            Quitter (déconnexion)
          </button>
        </form>
      </div>
    </div>
  )
}
