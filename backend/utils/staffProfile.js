const { STAFF_ROLES, ROLE_DIRECTEUR } = require('./staffRoles');

/** Rôles staff (hors étudiant). */
function isStaffRole(role) {
  return STAFF_ROLES.includes(role) || role === ROLE_DIRECTEUR;
}

/**
 * Staff : plus aucune complétion forcée (naissance / photo) à l’activation.
 * Les infos personnelles se complètent librement depuis Mon profil.
 */
function staffNeedsProfileCompletion() {
  return false;
}

module.exports = {
  isStaffRole,
  staffNeedsProfileCompletion,
};
