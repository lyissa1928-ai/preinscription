import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaGraduationCap, FaInfoCircle, FaEnvelopeOpenText } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'

export default function ResetPasswordMatricule() {
  const [matricule, setMatricule] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')
  const [fieldError, setFieldError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setServerError('')
    const m = matricule.trim()
    if (!m) {
      setFieldError('Indiquez votre matricule.')
      toast.error('Indiquez votre matricule.')
      return
    }
    setFieldError('')
    setLoading(true)
    try {
      await axios.post('/api/auth/reinitialiser-mot-de-passe-matricule', { matricule: m })
      setSent(true)
    } catch (err) {
      const msg = err.response?.data?.message || 'Impossible d’envoyer l’e-mail de réinitialisation.'
      setServerError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8 md:py-12">
      <AuthCinematicBackground showProgressDots={false} />

      <div className="relative z-10 w-full max-w-lg mx-auto min-h-[min(100vh,860px)] flex flex-col justify-center py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/40 mb-4 backdrop-blur-sm shadow-lg">
            <FaGraduationCap className="text-amber-200 text-3xl" aria-hidden />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
            Mot de passe oublié
          </h1>
          <p className="text-blue-100/95 text-sm mt-2 max-w-sm mx-auto [text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">
            Indiquez votre matricule : un code de réinitialisation sera envoyé à l’adresse
            e-mail associée à votre compte.
          </p>
        </div>

        <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-6 md:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200">
                <FaEnvelopeOpenText className="text-emerald-600 text-2xl" aria-hidden />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Vérifiez votre boîte mail</h2>
              <p className="text-sm text-slate-600">
                Si un compte étudiant existe avec ce matricule, un code de réinitialisation
                vient d’être envoyé à l’adresse du compte. Il est valable 15 minutes et à usage unique.
              </p>
              <p className="text-xs text-slate-500">
                Pensez à vérifier le dossier spam. Vous n’avez plus accès à cette adresse ?{' '}
                <a
                  href="mailto:lyissa15@gmail.com?subject=UniPr%C3%A9inscription%20%E2%80%94%20Acc%C3%A8s%20au%20compte"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Écrire au support
                </a>
              </p>
              <Link to="/mot-de-passe-oublie-email" className="btn-primary inline-flex h-11 items-center px-6">
                Saisir le code reçu
              </Link>
              <Link to="/connexion" className="block text-sm font-semibold text-blue-700 hover:underline">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div
                  role="alert"
                  className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                >
                  <FaInfoCircle className="mt-0.5 shrink-0 text-red-600" aria-hidden />
                  <p>{serverError}</p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="rpm-matricule" className="label-field">
                    Matricule
                  </label>
                  <input
                    id="rpm-matricule"
                    className={`input-field font-mono uppercase ${fieldError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    placeholder="Ex. ABC001"
                    value={matricule}
                    onChange={(e) => {
                      setMatricule(e.target.value)
                      setFieldError('')
                      setServerError('')
                    }}
                    autoComplete="username"
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? 'err-matricule' : 'rpm-hint'}
                  />
                  {fieldError ? (
                    <p id="err-matricule" className="mt-1.5 text-xs font-medium text-red-600">
                      {fieldError}
                    </p>
                  ) : (
                    <p id="rpm-hint" className="mt-1.5 text-xs text-slate-500">
                      Pour votre sécurité, le mot de passe ne peut être changé que via le lien
                      envoyé par e-mail.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full h-12 text-base shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Envoi…
                    </span>
                  ) : (
                    'Recevoir le lien de réinitialisation'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                Vous connaissez votre adresse e-mail ?{' '}
                <Link to="/mot-de-passe-oublie" className="font-semibold text-blue-600 hover:underline">
                  Choisir une autre méthode
                </Link>
              </p>
              <p className="mt-3 text-center text-sm text-slate-600">
                <Link to="/connexion" className="font-semibold text-blue-600 hover:underline">
                  Retour à la connexion
                </Link>
              </p>
              <p className="mt-3 text-center text-xs text-slate-500">
                Matricule oublié ?{' '}
                <a
                  href="mailto:lyissa15@gmail.com?subject=UniPr%C3%A9inscription%20%E2%80%94%20R%C3%A9cup%C3%A9ration%20de%20matricule"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Écrire au support
                </a>
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-white/95 underline-offset-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] hover:underline"
          >
            ← Retour à l’accueil
          </Link>
        </p>
      </div>
    </div>
  )
}
