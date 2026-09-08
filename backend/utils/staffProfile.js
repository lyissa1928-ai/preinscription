const { STAFF_ROLES, ROLE_DIRECTEUR } = require('./staffRoles');

/** Rôles staff (hors étudiant) concernés par la complétion de profil. */
function isStaffRole(role) {
  return STAFF_ROLES.includes(role) || role === ROLE_DIRECTEUR;
}

/**
 * Activation : date de naissance + photo obligatoires si le compte a été
 * créé en mode allégé (must_complete_profile === true).
 * Comptes legacy sans flag : uniquement si date de naissance manquante.
 */
function staffNeedsProfileCompletion(user) {
  if (!user || !isStaffRole(user.role)) return false;
  if (user.must_complete_profile === false) return false;
  const dn = user.date_naissance != null ? String(user.date_naissance).trim() : '';
  if (user.must_complete_profile === true) {
    return !dn || !user.photo_url;
  }
  return !dn;
}

module.exports = {
  isStaffRole,
  staffNeedsProfileCompletion,
};
