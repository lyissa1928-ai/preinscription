import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaIdCard, FaPhone, FaKey, FaShieldAlt } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'

export default function ResetPasswordStaff() {
  const [matricule, setMatricule] = useState('')
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [emailHint, setEmailHint] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setTempPassword('')
    if (!matricule.trim() || !telephone.trim()) {
      toast.error('Matricule et téléphone requis.')
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/reinitialiser-mot-de-passe-staff', {
        matricule: matricule.trim(),
        telephone: telephone.trim(),
      })
      setTempPassword(data.mot_de_passe_temporaire || '')
      setEmailHint(data.email || '')
      toast.success('Mot de passe temporaire généré')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Réinitialisation impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <AuthCinematicBackground showProgressDots={false} />
      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/40 bg-white/15 backdrop-blur">
            <FaShieldAlt className="text-2xl text-amber-200" />
          </div>
          <h1 className="text-2xl font-extrabold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
            Mot de passe oublié — Personnel
          </h1>
          <p className="mt-2 text-sm text-blue-100/95">
            Indiquez votre matricule et le téléphone enregistré sur votre compte.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur">
          <label className="mb-1 block text-xs font-bold text-slate-600">Matricule</label>
          <div className="relative mb-4">
            <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="Ex. RESP-000012"
              autoComplete="username"
            />
          </div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Téléphone</label>
          <div className="relative mb-5">
            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Numéro enregistré"
              autoComplete="tel"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Génération…' : 'Générer un nouveau mot de passe'}
          </button>

          {tempPassword && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                <FaKey /> Mot de passe temporaire
              </p>
              <p className="mt-2 break-all font-mono text-lg font-black text-emerald-950">{tempPassword}</p>
              {emailHint && <p className="mt-1 text-xs text-emerald-800">Compte : {emailHint}</p>}
              <p className="mt-2 text-xs text-emerald-800">
                Connectez-vous avec ce mot de passe, puis changez-le immédiatement.
              </p>
              <Link to="/connexion" className="mt-3 inline-block text-sm font-bold text-emerald-900 underline">
                Aller à la connexion →
              </Link>
            </div>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-white/90">
          <Link to="/connexion" className="font-semibold underline">Retour connexion</Link>
          {' · '}
          <Link to="/mot-de-passe-oublie" className="font-semibold underline">Autre méthode</Link>
        </p>
      </div>
    </div>
  )
}
