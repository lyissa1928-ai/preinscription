import { useNavigate } from 'react-router-dom'

/** Accueil logique selon le rôle (boutons Retour, redirections). */
export function getRoleHome(role) {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'admin_etablissement':
      return '/mon-etablissement'
    case 'responsable':
    case 'responsable_fad':
    case 'agent_fad':
      return '/responsable'
    case 'agent_admin':
      return '/agent-admin'
    case 'comptable':
      return '/comptable'
    case 'controleur_qualite':
      return '/qualite'
    case 'etudiant':
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

/**
 * Retour navigateur si historique disponible, sinon `fallback`.
 * @param {string} fallback
 */
export function useSmartBack(fallback) {
  const navigate = useNavigate()
  return () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback || '/dashboard')
    }
  }
}
