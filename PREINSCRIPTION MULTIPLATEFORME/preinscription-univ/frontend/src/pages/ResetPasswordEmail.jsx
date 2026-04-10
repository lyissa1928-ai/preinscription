import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { FaEye, FaEyeSlash, FaGraduationCap } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'
import { validatePasswordPolicy } from '@/lib/inscriptionValidation'

export default function ResetPasswordEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const token = searchParams.get('token')?.trim() || ''
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Lien invalide.')
      return
    }
    if (pwd !== confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    const vp = validatePasswordPolicy(pwd)
    if (!vp.ok) {
      toast.error(vp.message)
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/reinitialiser-mot-de-passe-email', {
        token,
        nouveau_mot_de_passe: pwd,
        confirmation: confirm,
      })
      login(data.token, data.utilisateur)
      toast.success(data.message || 'Mot de passe mis à jour.')
      const role = data.utilisateur?.role
      const dest =
        role === 'admin'
          ? '/admin'
          : role === 'controleur_qualite'
              ? '/qualite'
              : ['responsable', 'agent_admin', 'comptable'].includes(role)
                ? '/mon-etablissement'
                : '/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lien invalide ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-slate-700">
          Lien incomplet.{' '}
          <Link to="/mot-de-passe-oublie-email" className="text-blue-600 underline">
            Demander un nouvel e-mail
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8">
      <AuthCinematicBackground showProgressDots={false} />
      <div className="relative z-10 w-full max-w-lg mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-8 shadow-xl w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold mb-4">
            <FaGraduationCap /> Nouveau mot de passe
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Choisissez un nouveau mot de passe</h1>
          <form onSubmit={submit} className="space-y-4 mt-6">
            <div>
              <label className="label-field" htmlFor="np1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="np1"
                  type={show ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShow(!show)}
                  aria-label="Afficher"
                >
                  {show ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-field" htmlFor="np2">
                Confirmation
              </label>
              <input
                id="np2"
                type={show ? 'text' : 'password'}
                className="input-field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Enregistrement…' : 'Enregistrer et me connecter'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link to="/connexion" className="text-slate-600 hover:underline">
              ← Connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
