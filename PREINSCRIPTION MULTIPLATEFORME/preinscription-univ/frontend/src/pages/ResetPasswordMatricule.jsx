import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaGraduationCap, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter'

const MIN_LEN = 6

export default function ResetPasswordMatricule() {
  const [form, setForm] = useState({ matricule: '', nouveau_mot_de_passe: '', confirmation: '' })
  const [loading, setLoading] = useState(false)
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [serverError, setServerError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const navigate = useNavigate()

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setServerError('')
  }

  const validate = () => {
    const err = {}
    const m = form.matricule.trim()
    if (!m) err.matricule = 'Indiquez votre matricule.'
    const pw = form.nouveau_mot_de_passe
    if (pw.length < MIN_LEN) err.nouveau_mot_de_passe = `Au moins ${MIN_LEN} caractères.`
    if (form.confirmation !== pw) err.confirmation = 'Les deux mots de passe ne correspondent pas.'
    setFieldErrors(err)
    return Object.keys(err).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (!validate()) {
      toast.error('Vérifiez les champs en surbrillance.')
      return
    }
    setLoading(true)
    try {
      await axios.post('/api/auth/reinitialiser-mot-de-passe-matricule', {
        matricule: form.matricule.trim(),
        nouveau_mot_de_passe: form.nouveau_mot_de_passe,
        confirmation: form.confirmation,
      })
      toast.success('Mot de passe mis à jour. Connectez-vous avec votre email.')
      navigate('/connexion')
    } catch (err) {
      const msg = err.response?.data?.message || 'Impossible de réinitialiser le mot de passe.'
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
            Nouveau mot de passe
          </h1>
          <p className="text-blue-100/95 text-sm mt-2 max-w-sm mx-auto [text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">
            À l’aide de votre matricule étudiant
          </p>
        </div>

        <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-6 md:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
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
                className={`input-field font-mono uppercase ${fieldErrors.matricule ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                placeholder="Ex. ABC001"
                value={form.matricule}
                onChange={(e) => {
                  setForm({ ...form, matricule: e.target.value })
                  clearFieldError('matricule')
                }}
                autoComplete="username"
                aria-invalid={Boolean(fieldErrors.matricule)}
                aria-describedby={fieldErrors.matricule ? 'err-matricule' : undefined}
              />
              {fieldErrors.matricule && (
                <p id="err-matricule" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.matricule}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="rpm-pw" className="label-field">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="rpm-pw"
                  type={show1 ? 'text' : 'password'}
                  className={`input-field pr-10 ${fieldErrors.nouveau_mot_de_passe ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  value={form.nouveau_mot_de_passe}
                  onChange={(e) => {
                    setForm({ ...form, nouveau_mot_de_passe: e.target.value })
                    clearFieldError('nouveau_mot_de_passe')
                  }}
                  minLength={MIN_LEN}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.nouveau_mot_de_passe)}
                  aria-describedby="rpm-pw-hint err-nouveau"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShow1(!show1)}
                  aria-label={show1 ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {show1 ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p id="rpm-pw-hint" className="mt-1.5 text-xs text-slate-500">
                Minimum {MIN_LEN} caractères — idéalement majuscules, chiffres et un symbole.
              </p>
              <PasswordStrengthMeter password={form.nouveau_mot_de_passe} className="mt-2" />
              {fieldErrors.nouveau_mot_de_passe && (
                <p id="err-nouveau" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.nouveau_mot_de_passe}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="rpm-confirm" className="label-field">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="rpm-confirm"
                  type={show2 ? 'text' : 'password'}
                  className={`input-field pr-10 ${fieldErrors.confirmation ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  value={form.confirmation}
                  onChange={(e) => {
                    setForm({ ...form, confirmation: e.target.value })
                    clearFieldError('confirmation')
                  }}
                  minLength={MIN_LEN}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmation)}
                  aria-describedby={fieldErrors.confirmation ? 'err-confirm' : undefined}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShow2(!show2)}
                  aria-label={show2 ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                >
                  {show2 ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {fieldErrors.confirmation && (
                <p id="err-confirm" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.confirmation}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base shadow-lg shadow-blue-500/20">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enregistrement…
                </span>
              ) : (
                'Enregistrer le nouveau mot de passe'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
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
