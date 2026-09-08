import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { FaGraduationCap, FaUserTie, FaEnvelope } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'

export default function MotDePasseOublie() {
  const [emailResetEnabled, setEmailResetEnabled] = useState(true)
  const [smtpConfigured, setSmtpConfigured] = useState(true)

  useEffect(() => {
    axios
      .get('/api/auth/options-public')
      .then(({ data }) => {
        setEmailResetEnabled(Boolean(data?.password_reset_email_enabled))
        setSmtpConfigured(Boolean(data?.smtp_configured))
      })
      .catch(() => {})
  }, [])

  const options = [
    {
      to: '/mot-de-passe-oublie-email',
      icon: FaEnvelope,
      title: 'Par e-mail',
      desc: 'Recevoir un lien sécurisé et un code sur votre boîte mail (étudiants et personnel).',
      primary: true,
      disabled: !emailResetEnabled,
    },
    {
      to: '/mot-de-passe-oublie-matricule',
      icon: FaGraduationCap,
      title: 'Je suis étudiant',
      desc: 'Avec mon matricule : un e-mail de réinitialisation est envoyé à l’adresse du compte.',
      disabled: !emailResetEnabled,
    },
    {
      to: '/mot-de-passe-oublie-personnel',
      icon: FaUserTie,
      title: 'Je suis personnel',
      desc: 'Avec mon matricule et mon téléphone : un lien sécurisé est envoyé par e-mail.',
      disabled: !emailResetEnabled,
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <AuthCinematicBackground showProgressDots={false} />
      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-sm text-blue-100/95">
            Choisissez la méthode adaptée. Aucun mot de passe n’est jamais envoyé en clair.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/20 bg-white/95 p-5 shadow-xl backdrop-blur">
          {!smtpConfigured && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              L’envoi d’e-mails n’est pas configuré sur le serveur (SMTP). Contactez un administrateur.
            </p>
          )}
          {options.map(({ to, icon: Icon, title, desc, disabled, primary }) => (
            disabled ? (
              <div
                key={to}
                className="flex cursor-not-allowed gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 opacity-60"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                  <Icon className="text-lg" aria-hidden />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-bold text-slate-700">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
                </div>
              </div>
            ) : (
              <Link
                key={to}
                to={to}
                className={`flex gap-4 rounded-xl border p-4 transition hover:border-blue-300 hover:bg-blue-50/60 ${
                  primary ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200'
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Icon className="text-lg" aria-hidden />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-bold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{desc}</p>
                </div>
              </Link>
            )
          ))}

          <p className="pt-2 text-center text-xs text-slate-500">
            Matricule oublié ? Contactez la scolarité de votre établissement.
          </p>
        </div>

        <p className="mt-5 text-center">
          <Link to="/connexion" className="text-sm font-semibold text-white/95 underline underline-offset-2">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
