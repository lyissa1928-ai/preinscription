import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { FaGraduationCap, FaEye, FaEyeSlash } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'
import { sanitizeNextPath } from '@/lib/navigation'

const BRANDS = [
  {
    nom: 'ESEBAT',
    domaine: 'BTP / Génie Civil',
    couleurs: 'from-orange-500 to-amber-400',
    image: new URL('../../img/ESEBATBTP.jpg', import.meta.url).href,
  },
  {
    nom: 'ESCOA',
    domaine: 'Commerce / Gestion',
    couleurs: 'from-slate-900 to-blue-900',
    image: new URL('../../img/ESCOA.jpg', import.meta.url).href,
  },
  {
    nom: 'EFOSANTE',
    domaine: 'Santé',
    couleurs: 'from-red-700 to-sky-400',
    image: new URL('../../img/EFOSANTE.jpg', import.meta.url).href,
  },
]

export default function Login() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ email: '', mot_de_passe: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [authOptions, setAuthOptions] = useState({ email_verification: false })
  const [resendLoading, setResendLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const pending = location.state?.pendingEmailVerification
    if (typeof pending === 'string' && pending.trim()) {
      setForm((f) => ({ ...f, email: pending.trim().toLowerCase() }))
      if (typeof window !== 'undefined') window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    axios
      .get('/api/auth/options-public')
      .then(({ data }) =>
        setAuthOptions({
          email_verification: Boolean(data?.email_verification_enabled),
        }),
      )
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/connexion', form)
      login(data.token, data.utilisateur, data.refresh_token)
      const u = data.utilisateur
      toast.success(`Bienvenue, ${u.prenom || u.nom} !`)
      if (u.must_change_password) {
        navigate('/changer-mot-de-passe-obligatoire', { replace: true })
        return
      }
      const role = u.role
      let dest = role === 'admin' ? '/admin'
        : role === 'admin_etablissement' ? '/mon-etablissement/equipe'
        : role === 'controleur_qualite' ? '/qualite'
        : ['responsable', 'responsable_fad', 'agent_admin', 'comptable'].includes(role) ? '/mon-etablissement'
        : '/dashboard'
      const nextUrl =
        sanitizeNextPath(searchParams.get('next') || searchParams.get('redirect')) ||
        sanitizeNextPath(location.state?.next)
      if (role === 'etudiant' && nextUrl) {
        dest = nextUrl
      }
      navigate(dest, { replace: true })
    } catch (err) {
      const d = err.response?.data
      if (d?.code === 'EMAIL_NOT_VERIFIED') {
        const full = d.message || 'E-mail non confirmé.'
        setFormError(full)
        toast.error(full, { duration: 6000 })
      } else if (d?.code === 'ACCOUNT_LOCKED') {
        const sec = typeof d.retry_after_sec === 'number' ? d.retry_after_sec : null
        const min = sec != null ? Math.max(1, Math.ceil(sec / 60)) : null
        const extra = min != null ? ` Réessayez dans environ ${min} minute${min > 1 ? 's' : ''}.` : ''
        const full = (d.message || 'Compte temporairement bloqué.') + extra
        setFormError(full)
        toast.error(full, { duration: 6500 })
      } else {
        const msg = d?.message || 'Erreur de connexion'
        setFormError(msg)
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8">
      <AuthCinematicBackground showProgressDots={false} />

      <div className="relative z-10 w-full max-w-5xl mx-auto min-h-screen flex items-center justify-center py-10">
        <div className="w-full max-w-xl group">
          <div className="mb-8 rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-2.5 transition-all duration-300 group-hover:bg-white/15 group-hover:border-white/45">
            <div className="grid grid-cols-3 gap-2">
            {BRANDS.map((b) => (
              <div key={b.nom} className="rounded-xl border border-white/40 bg-white/20 backdrop-blur-sm p-1.5 shadow-lg transition-transform duration-300 hover:-translate-y-1">
                <img src={b.image} alt={b.nom} className="w-full h-12 object-cover rounded-md mb-1.5" loading="lazy" />
                <div className={`h-1 rounded-full bg-gradient-to-r ${b.couleurs} mb-1.5`} />
                <p className="text-[10px] font-bold text-white tracking-wide drop-shadow-md">{b.nom}</p>
              </div>
            ))}
            </div>
          </div>

          <div className="text-center mb-8 px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/40 text-xs font-semibold text-white backdrop-blur-sm mb-4 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
              <FaGraduationCap className="text-amber-200" aria-hidden />
              Plateforme multi-établissements
            </div>
            <div className="rounded-2xl bg-black/25 px-4 py-3 backdrop-blur-[2px] ring-1 ring-white/10">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.5),0_4px_24px_rgba(0,0,0,0.45)]">
                Connexion à votre espace
              </h1>
              <p className="text-blue-50/95 mt-2 text-sm md:text-base [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                Accédez à votre espace personnel
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_28px_85px_rgba(0,0,0,0.45)] md:p-8">
            {formError && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              >
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label-field" htmlFor="login-email">
                  Adresse email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  placeholder="exemple@email.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value })
                    if (formError) setFormError('')
                  }}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="label-field" htmlFor="login-password">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="Votre mot de passe"
                    value={form.mot_de_passe}
                    onChange={(e) => {
                      setForm({ ...form, mot_de_passe: e.target.value })
                      if (formError) setFormError('')
                    }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base shadow-lg shadow-blue-300/30 transition-transform duration-200 hover:-translate-y-0.5">
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Pas encore de compte ?{' '}
                <Link to="/inscription" className="text-blue-600 hover:underline font-medium">
                  Créer un compte
                </Link>
                {import.meta.env.DEV && (
                  <span className="text-gray-500"> (vérification anti-bot requise)</span>
                )}
              </p>
              <p className="text-sm">
                <Link to="/mot-de-passe-oublie" className="text-blue-600 hover:underline font-medium">
                  Mot de passe oublié ?
                </Link>
              </p>
              {authOptions.email_verification && form.email.trim() && (
                <p className="text-xs text-slate-600">
                  <button
                    type="button"
                    disabled={resendLoading}
                    className="text-blue-600 hover:underline font-medium disabled:opacity-50"
                    onClick={async () => {
                      setResendLoading(true)
                      try {
                        const { data } = await axios.post('/api/auth/renvoyer-email-verification', {
                          email: form.email.trim().toLowerCase(),
                        })
                        toast.success(data?.message || 'Si besoin, un e-mail vient d’être envoyé.')
                      } catch {
                        toast.error('Impossible d’envoyer pour le moment.')
                      } finally {
                        setResendLoading(false)
                      }
                    }}
                  >
                    {resendLoading ? 'Envoi…' : 'Renvoyer l’e-mail de confirmation'}
                  </button>
                </p>
              )}
            </div>

            {import.meta.env.DEV && (
              <div className="mt-4 rounded-xl border border-dashed border-amber-200/80 bg-amber-50/90 p-3 text-xs text-amber-950">
                <strong className="font-semibold">Dev — compte test :</strong>{' '}
                <span className="font-mono">admin@universite.sn</span> / <span className="font-mono">Admin123!</span>
              </div>
            )}
          </div>

          <p className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-white/95 underline-offset-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.65)] hover:text-white hover:underline"
            >
              ← Retour à l’accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
