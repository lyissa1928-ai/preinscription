import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaGraduationCap } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'

export default function ForgotPasswordEmail() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Indiquez votre adresse e-mail.')
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/mot-de-passe-oublie-email', {
        email: email.trim().toLowerCase(),
      })
      toast.success(data.message || 'Si un compte existe, un e-mail a été envoyé.')
      setSent(true)
    } catch {
      toast.error('Impossible d’envoyer la demande pour le moment.')
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
          <p className="text-sm text-slate-600 mb-6">
            Saisissez l’adresse e-mail de votre compte étudiant. Vous recevrez un lien valable 1 heure pour choisir un
            nouveau mot de passe.
          </p>
          {sent ? (
            <p className="text-slate-700 mb-4">
              Si un compte existe avec cette adresse, consultez votre boîte de réception (et les courriers indésirables).
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
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
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
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
