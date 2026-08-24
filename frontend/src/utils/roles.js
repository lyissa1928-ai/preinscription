/**
 * Rôles et fonctions supplémentaires.
 *
 * Le backend expose `user.fonctions` (ex. ['responsable'] pour un membre
 * désigné responsable d'établissement sans en avoir le rôle principal).
 * Toute vérification d'accès frontend doit passer par ces helpers pour que
 * la fonction ouvre les mêmes zones que le rôle correspondant.
 */

/** L'utilisateur correspond-il à l'un des rôles requis (rôle principal ou fonction) ? */
export function userMatchesRoles(user, roles) {
  if (!user || !Array.isArray(roles)) return false
  if (roles.includes(user.role)) return true
  return (user.fonctions || []).some((f) => roles.includes(f))
}

/** Rôle `responsable` ou fonction « responsable d'établissement » désignée. */
export function actsAsResponsable(user) {
  return user?.role === 'responsable' || (user?.fonctions || []).includes('responsable')
}
