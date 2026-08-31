/**
 * Messagerie — uniquement entre comptes de la plateforme, même établissement :
 * - Étudiants ↔ personnel / responsables / agents du même établissement
 * - Staff ↔ staff du même établissement
 * - Étudiants entre eux : interdit (sauf éventuelle autorisation admin future)
 * - Jamais d’échange libre vers un autre établissement
 * Les comptes admin sans établissement ne participent pas au chat.
 */

const STAFF_ROLES = new Set([
  'admin_etablissement',
  'responsable',
  'agent_admin',
  'comptable',
  'controleur_qualite',
])

function isStaffRole(role) {
  return STAFF_ROLES.has(role)
}

/** Rôle `responsable` ou fonction désignée (si l'appelant a enrichi l'utilisateur). */
function actsAsResponsable(u) {
  return u?.role === 'responsable' || (u?.fonctions || []).includes('responsable')
}

function sameEtab(a, b) {
  const ea = a.etablissement_id ?? null
  const eb = b.etablissement_id ?? null
  if (ea == null || eb == null || Number(ea) !== Number(eb)) return false
  return true
}

/** @returns {boolean} */
function canChatWith(a, b) {
  if (!a || !b || a.id === b.id) return false
  if (a.role === 'admin' || b.role === 'admin') return false
  if (!sameEtab(a, b)) return false

  const ar = a.role
  const br = b.role

  // Étudiants entre eux : interdit
  if (ar === 'etudiant' && br === 'etudiant') return false

  // Étudiant ↔ tout le personnel du même établissement
  if (ar === 'etudiant') return isStaffRole(br)
  if (br === 'etudiant') return isStaffRole(ar)

  // Staff ↔ staff (même établissement)
  if (isStaffRole(ar) && isStaffRole(br)) return true

  return false
}


function conversationKey(etablissementId, userIdA, userIdB) {
  const u1 = Number(userIdA)
  const u2 = Number(userIdB)
  const lo = Math.min(u1, u2)
  const hi = Math.max(u1, u2)
  return `e${Number(etablissementId)}:u${lo}:u${hi}`
}

module.exports = {
  canChatWith,
  conversationKey,
  isStaffRole,
  STAFF_ROLES,
}
