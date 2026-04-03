import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FaGraduationCap } from 'react-icons/fa'

const SUPPORT = 'lyissa15@gmail.com'
const mailtoMatricule = `mailto:${SUPPORT}?subject=${encodeURIComponent('UniPréinscription — Récupération de matricule')}&body=${encodeURIComponent('Bonjour,\n\nJe ne retrouve plus mon matricule. Mon nom : \nMon email d’inscription : \n\nMerci.')}`

export default function MesAccesEtudiant() {
  const { user } = useAuth()

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <FaGraduationCap className="text-blue-700 text-4xl mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-gray-900">Mes identifiants</h1>
        <p className="text-gray-600 text-sm mt-1">Ce que vous utilisez pour vous connecter et postuler.</p>
      </div>

      <div className="card space-y-4">
        {user?.etablissement_nom && (
          <p className="text-sm text-gray-700 pb-2 border-b border-gray-100">
            <span className="text-gray-500">Établissement :</span> <strong>{user.etablissement_nom}</strong>
          </p>
        )}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase">Email (identifiant de connexion)</p>
          <p className="font-mono text-gray-900 mt-1">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase">Matricule</p>
          <p className="font-mono text-lg font-bold text-blue-800 mt-1">{user?.matricule || '—'}</p>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-2">Mot de passe</p>
          <p>Pour des raisons de sécurité, le mot de passe n’est pas stocké en clair et ne peut pas être affiché ici.</p>
          <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
            <li>
              <Link to="/mot-de-passe-oublie-email" className="text-blue-600 hover:underline font-medium">
                Recevoir un lien de réinitialisation par e-mail
              </Link>
            </li>
            <li>
              <Link to="/mot-de-passe-oublie-matricule" className="text-blue-600 hover:underline font-medium">
                Définir un nouveau mot de passe avec mon matricule
              </Link>
            </li>
            <li>
              <a href={mailtoMatricule} className="text-blue-600 hover:underline font-medium">
                J’ai oublié mon matricule — écrire au support
              </a>
              {' '}
              <span className="text-gray-500">({SUPPORT})</span>
            </li>
          </ul>
        </div>
        <Link to="/dashboard" className="btn-secondary w-full text-center block">Retour au tableau de bord</Link>
      </div>
    </div>
  )
}
