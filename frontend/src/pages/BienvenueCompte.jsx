import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sanitizeNextPath } from '@/lib/navigation'
import { FaGraduationCap, FaCopy } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function BienvenueCompte() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const afterWelcome = sanitizeNextPath(location.state?.next) || '/dashboard'

  // Mot de passe reçu via l'état de navigation (mémoire uniquement, jamais
  // persisté) : il disparaît au refresh ou dès qu'on quitte la page.
  const passwordOnce = location.state?.passwordOnce || null

  const copy = (label, text) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copié`)).catch(() => toast.error('Copie impossible'))
  }

  const continuer = () => {
    navigate(afterWelcome, { replace: true })
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <FaGraduationCap className="text-blue-700 text-5xl mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur UniPréinscription</h1>
        <p className="text-gray-600 mt-2 text-sm">
          Conservez ces informations en lieu sûr. Le mot de passe affiché ici ne pourra plus être récupéré tel quel.
        </p>
        <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-left text-sm text-slate-700">
          <strong className="text-slate-900">Créer un compte ne signifie pas préinscription.</strong> Une fois connecté, vous pourrez
          soit déposer un <strong>dossier de préinscription</strong>, soit faire une <strong>demande de facture proforma</strong> — au
          choix, depuis votre tableau de bord.
        </p>
      </div>

      <div className="card space-y-4 border-blue-100 bg-blue-50/40">
        {user?.etablissement_nom && (
          <p className="text-sm text-gray-700">
            <span className="text-gray-500">Établissement :</span>{' '}
            <strong>{user.etablissement_nom}</strong>
          </p>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Connexion (email)</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm text-gray-900 break-all">{user?.email || '—'}</span>
            <button type="button" onClick={() => copy('Email', user?.email)} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg shrink-0" title="Copier">
              <FaCopy />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Matricule</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-bold text-blue-800">{user?.matricule || '—'}</span>
            <button type="button" onClick={() => copy('Matricule', user?.matricule)} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg shrink-0" title="Copier">
              <FaCopy />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Mot de passe (affiché une seule fois)</p>
          {passwordOnce ? (
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-gray-900 break-all">{passwordOnce}</span>
              <button type="button" onClick={() => copy('Mot de passe', passwordOnce)} className="text-amber-700 p-2 hover:bg-amber-100 rounded-lg shrink-0" title="Copier">
                <FaCopy />
              </button>
            </div>
          ) : (
            <p className="text-sm text-amber-900">
              Le mot de passe n’est affiché qu’une seule fois, juste après la création du compte.
              Si vous l’avez oublié, utilisez « Mot de passe oublié » depuis la page de connexion :
              un lien de réinitialisation sera envoyé à votre adresse e-mail.
            </p>
          )}
        </div>

        <button type="button" onClick={continuer} className="btn-primary w-full py-3">
          Accéder à mon espace
        </button>

        <p className="text-center text-xs text-gray-500">
          <Link to="/mes-acces" className="text-blue-600 hover:underline">Mes identifiants</Link>
          {' · '}
          <Link to="/connexion" className="text-blue-600 hover:underline">Connexion</Link>
        </p>
      </div>
    </div>
  )
}
