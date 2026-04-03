import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaGraduationCap, FaEye, FaEyeSlash, FaInfoCircle, FaShieldAlt } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import AuthCinematicBackground from '../components/AuthCinematicBackground'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter'

const MIN_LEN = 6

export default function ForcePasswordChange() {
  const { user, loading, refreshUser, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    matricule: '',
    ancien: '',
    nouveau: '',
    confirmation: '',
  })
  const [showAncien, setShowAncien] = useState(false)
  const [showNouveau, setShowNouveau] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (user?.matricule) {
      setForm((f) => ({ ...f, matricule: String(user.matricule).trim() }))
    }
  }, [user?.matricule])

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setServerError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-amber-600 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-amber-900/80">Chargement de votre session…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/connexion" replace />

  if (!user.must_change_password) {
    const dest =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'directeur'
          ? '/directeur'
          : ['responsable', 'agent_admin', 'comptable'].includes(user.role)
            ? '/mon-etablissement'
            : '/dashboard'
    return <Navigate to={dest} replace />
  }

  const validate = () => {
    const err = {}
    const m = String(form.matricule || '').trim()
    if (!m) err.matricule = 'Indiquez votre matricule.'
    if (!form.ancien) err.ancien = 'Saisissez votre mot de passe actuel.'
    if (form.nouveau.length < MIN_LEN) err.nouveau = `Au moins ${MIN_LEN} caractères.`
    if (form.nouveau !== form.confirmation) err.confirmation = 'Les deux mots de passe ne correspondent pas.'
    setFieldErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (!validate()) {
      toast.error('Vérifiez les champs en surbrillance.')
      return
    }
    const m = String(form.matricule || '').trim()
    setSaving(true)
    try {
      const { data } = await axios.post('/api/auth/changer-mot-de-passe-obligatoire', {
        matricule: m,
        ancien_mot_de_passe: form.ancien,
        nouveau_mot_de_passe: form.nouveau,
        confirmation: form.confirmation,
      })
      if (data.token && data.utilisateur) {
        login(data.token, data.utilisateur)
      } else {
        await refreshUser()
      }
      toast.success('Mot de passe mis à jour')
      const dest =
        user.role === 'admin'
          ? '/admin'
          : user.role === 'directeur'
            ? '/directeur'
            : ['responsable', 'agent_admin', 'comptable'].includes(user.role)
              ? '/mon-etablissement'
              : '/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors du changement de mot de passe.'
      setServerError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8 md:py-12">
      <AuthCinematicBackground showProgressDots={false} />

      <div className="relative z-10 w-full max-w-lg mx-auto min-h-[min(100vh,920px)] flex flex-col justify-center py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-200/50 mb-4 backdrop-blur-sm">
            <FaShieldAlt className="text-amber-200 text-2xl" aria-hidden />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
            Sécurisation du compte
          </h1>
          <p className="text-blue-100/95 text-sm mt-2 max-w-md mx-auto leading-relaxed [text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">
            Confirmez votre <strong className="text-white">matricule</strong>, puis votre mot de passe actuel et choisissez un{' '}
            <strong className="text-white">nouveau mot de passe personnel</strong>.
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200/80 bg-white/95 backdrop-blur-xl p-6 md:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.35)] ring-1 ring-amber-100/90">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 mb-5 text-xs text-amber-950">
            <FaGraduationCap className="shrink-0 mt-0.5 text-amber-700" aria-hidden />
            <p>
              Obligatoire pour continuer : ce changement protège votre accès (mot de passe temporaire ou initial remplacé).
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              <FaInfoCircle className="mt-0.5 shrink-0 text-red-600" aria-hidden />
              <p>{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="fpc-matricule" className="label-field">
                Matricule *
              </label>
              <input
                id="fpc-matricule"
                type="text"
                className={`input-field font-mono uppercase ${fieldErrors.matricule ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                value={form.matricule}
                onChange={(e) => {
                  setForm((f) => ({ ...f, matricule: e.target.value }))
                  clearFieldError('matricule')
                }}
                placeholder="Ex. UNI001"
                autoComplete="username"
                aria-invalid={Boolean(fieldErrors.matricule)}
                aria-describedby={fieldErrors.matricule ? 'fpc-err-mat' : undefined}
              />
              {fieldErrors.matricule && (
                <p id="fpc-err-mat" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.matricule}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fpc-ancien" className="label-field">
                Mot de passe actuel *
              </label>
              <div className="relative">
                <input
                  id="fpc-ancien"
                  type={showAncien ? 'text' : 'password'}
                  className={`input-field pr-10 ${fieldErrors.ancien ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  value={form.ancien}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, ancien: e.target.value }))
                    clearFieldError('ancien')
                  }}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.ancien)}
                  aria-describedby={fieldErrors.ancien ? 'fpc-err-ancien' : undefined}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShowAncien(!showAncien)}
                  aria-label={showAncien ? 'Masquer le mot de passe actuel' : 'Afficher le mot de passe actuel'}
                >
                  {showAncien ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {fieldErrors.ancien && (
                <p id="fpc-err-ancien" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.ancien}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fpc-nouveau" className="label-field">
                Nouveau mot de passe *
              </label>
              <div className="relative">
                <input
                  id="fpc-nouveau"
                  type={showNouveau ? 'text' : 'password'}
                  className={`input-field pr-10 ${fieldErrors.nouveau ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  value={form.nouveau}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, nouveau: e.target.value }))
                    clearFieldError('nouveau')
                  }}
                  minLength={MIN_LEN}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.nouveau)}
                  aria-describedby="fpc-pw-hint fpc-err-nouveau"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShowNouveau(!showNouveau)}
                  aria-label={showNouveau ? 'Masquer le nouveau mot de passe' : 'Afficher le nouveau mot de passe'}
                >
                  {showNouveau ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p id="fpc-pw-hint" className="mt-1.5 text-xs text-slate-500">
                Minimum {MIN_LEN} caractères — idéalement majuscules, chiffres et un symbole.
              </p>
              <PasswordStrengthMeter password={form.nouveau} className="mt-2" />
              {fieldErrors.nouveau && (
                <p id="fpc-err-nouveau" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.nouveau}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fpc-confirm" className="label-field">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <input
                  id="fpc-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className={`input-field pr-10 ${fieldErrors.confirmation ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  value={form.confirmation}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, confirmation: e.target.value }))
                    clearFieldError('confirmation')
                  }}
                  minLength={MIN_LEN}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmation)}
                  aria-describedby={fieldErrors.confirmation ? 'fpc-err-confirm' : undefined}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {fieldErrors.confirmation && (
                <p id="fpc-err-confirm" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.confirmation}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-md bg-gradient-to-r from-amber-600 to-orange-600 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:from-amber-700 hover:to-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enregistrement…
                </span>
              ) : (
                'Valider et accéder à l’application'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            to="/"
            className="font-medium text-white/95 underline-offset-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] hover:underline"
          >
            ← Retour à l’accueil
          </Link>
        </p>
      </div>
    </div>
  )
}
