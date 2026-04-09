/**
 * Messagerie (même établissement) :
 * - Étudiants : uniquement avec les responsables pédagogiques (role responsable).
 * - Directeur : uniquement avec le staff (pas les étudiants).
 * - Staff (responsable, agent_admin, comptable, controleur_qualite) : entre eux ;
 *   seul le responsable peut échanger avec les étudiants.
 * Les comptes admin sans établissement ne participent pas au chat.
 */

const STAFF_ROLES = new Set([
  'responsable',
  'agent_admin',
  'comptable',
  'directeur',
  'controleur_qualite',
])

function isStaffRole(role) {
  return STAFF_ROLES.has(role)
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

  // Étudiant ↔ uniquement responsable pédagogique
  if (ar === 'etudiant') return br === 'responsable'
  if (br === 'etudiant') return ar === 'responsable'

  // Directeur ↔ staff uniquement (pas étudiant, déjà traité)
  if (ar === 'directeur') return isStaffRole(br) && br !== 'etudiant'
  if (br === 'directeur') return isStaffRole(ar) && ar !== 'etudiant'

  // Autres cas staff ↔ staff
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
