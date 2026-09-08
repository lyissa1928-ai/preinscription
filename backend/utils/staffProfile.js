const { STAFF_ROLES, ROLE_DIRECTEUR } = require('./staffRoles');

/** Rôles staff (hors étudiant). */
function isStaffRole(role) {
  return STAFF_ROLES.includes(role) || role === ROLE_DIRECTEUR;
}

/**
 * Ancienne porte « naissance + photo » désactivée.
 * L’activation se fait uniquement par e-mail (lien de définition du mot de passe).
 * Le profil reste complétable librement depuis « Mon profil ».
 */
function staffNeedsProfileCompletion() {
  return false;
}

module.exports = {
  isStaffRole,
  staffNeedsProfileCompletion,
};
