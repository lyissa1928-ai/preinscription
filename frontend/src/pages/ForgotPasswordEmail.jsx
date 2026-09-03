import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaGraduationCap, FaEye, FaEyeSlash } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'
import { useAuth } from '../context/AuthContext'
import { validatePasswordPolicy } from '@/lib/inscriptionValidation'

function destForRole(role) {
  if (role === 'admin') return '/admin'
  if (role === 'admin_etablissement') return '/mon-etablissement'
  if (role === 'controleur_qualite') return '/qualite'
  if (role === 'responsable' || role === 'responsable_fad' || role === 'agent_fad') return '/responsable'
  if (role === 'agent_admin') return '/agent-admin'
  if (role === 'comptable') return '/comptable'
  return '/dashboard'
}

export default function ForgotPasswordEmail() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('email')
  const [info, setInfo] = useState('')

  const requestCode = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Indiquez l’adresse e-mail de votre compte.')
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/mot-de-passe-oublie-email', {
        email: email.trim().toLowerCase(),
      })
      const msg = data.message || 'Si un compte existe, un code a été envoyé.'
      toast.success(msg)
      setInfo(msg)
      setStep('code')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible d’envoyer la demande pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  const submitNewPassword = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      toast.error('Saisissez le code reçu par e-mail.')
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
        email: email.trim().toLowerCase(),
        code: code.trim(),
        nouveau_mot_de_passe: pwd,
        confirmation: confirm,
      })
      login(data.token, data.utilisateur, data.refresh_token)
      toast.success(data.message || 'Mot de passe mis à jour.')
      navigate(destForRole(data.utilisateur?.role), { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Code invalide ou expiré.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8">
      <AuthCinematicBackground showProgressDots={false} />
      <div className="relative z-10 w-full max-w-lg mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-8 shadow-xl w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold mb-4">
            <FaGraduationCap /> Mot de passe oublié
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Réinitialisation par e-mail</h1>

          {step === 'email' ? (
            <>
              <p className="text-sm text-slate-600 mb-6">
                Saisissez l’adresse e-mail enregistrée sur votre compte. Un code temporaire (15 minutes, usage unique)
                vous sera envoyé.
              </p>
              <form onSubmit={requestCode} className="space-y-4">
                <div>
                  <label className="label-field" htmlFor="fp-email">
                    E-mail du compte
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Envoi…' : 'Recevoir le code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">{info}</p>
              <p className="text-sm text-slate-600 mb-6">
                Entrez le code reçu, puis choisissez un nouveau mot de passe. Un code expiré ou déjà utilisé
                n’est plus valable.
              </p>
              <form onSubmit={submitNewPassword} className="space-y-4">
                <div>
                  <label className="label-field" htmlFor="fp-code">
                    Code reçu par e-mail
                  </label>
                  <input
                    id="fp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="input-field tracking-[0.35em] text-center text-lg font-semibold"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                  />
                </div>
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
                  {loading ? 'Enregistrement…' : 'Valider le code et enregistrer'}
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-blue-700 hover:underline"
                  onClick={() => { setStep('email'); setCode(''); }}
                >
                  Renvoyer un code
                </button>
              </form>
            </>
          )}
          <div className="mt-6 text-center text-sm space-y-2">
            <Link to="/mot-de-passe-oublie" className="text-blue-600 hover:underline block">
              Choisir une autre méthode
            </Link>
            <Link to="/connexion" className="text-slate-600 hover:underline block">
              ← Retour connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
