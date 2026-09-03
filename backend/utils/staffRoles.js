/** Rôle « administrateur établissement » — gestion du staff de son établissement uniquement. */
const ROLE_ADMIN_ETABLISSEMENT = 'admin_etablissement';

const STAFF_ROLES = [
  'admin',
  ROLE_ADMIN_ETABLISSEMENT,
  'responsable',
  'responsable_fad',
  'agent_admin',
  'comptable',
  'controleur_qualite',
];

/** Comptes staff rattachés à un établissement (hors admin global). */
const ETAB_STAFF_ROLES = STAFF_ROLES.filter((r) => r !== 'admin');

/** Création par l’admin plateforme (tous rôles staff). */
const ROLES_CREATABLE_PLATFORM = [...STAFF_ROLES];

/** Création par l’administrateur établissement (pas d’autre admin étab.). */
const ROLES_CREATABLE_ETAB_ADMIN = [
  'responsable',
  'responsable_fad',
  'agent_admin',
  'comptable',
  'controleur_qualite',
];

function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

function isAdminEtablissement(user) {
  return user?.role === ROLE_ADMIN_ETABLISSEMENT;
}

function isEtabScopedStaff(user) {
  return user && ETAB_STAFF_ROLES.includes(user.role);
}

/** Gestion des membres : admin plateforme ou admin de l’établissement concerné. */
function canManageEtabMembres(user, etabId) {
  if (isPlatformAdmin(user)) return true;
  if (isAdminEtablissement(user) && Number(user.etablissement_id) === Number(etabId)) {
    return true;
  }
  return false;
}

function rolesCreatablesMembres(user) {
  if (isPlatformAdmin(user)) return ROLES_CREATABLE_PLATFORM.filter((r) => r !== 'admin');
  if (isAdminEtablissement(user)) return ROLES_CREATABLE_ETAB_ADMIN;
  return [];
}

/**
 * L’acteur peut-il modifier / désactiver ce membre ?
 * @param {object} etab  établissement (id, responsable_id)
 */
function canManageTargetMembre(actor, targetUser, etab) {
  if (!targetUser || !etab) return false;
  if (targetUser.etablissement_id !== etab.id) return false;
  if (targetUser.role === 'etudiant') return false;
  if (isPlatformAdmin(actor)) return true;
  if (!isAdminEtablissement(actor)) return false;
  if (Number(actor.id) === Number(targetUser.id)) return false;
  if (targetUser.role === ROLE_ADMIN_ETABLISSEMENT) return false;
  if (targetUser.role === 'admin') return false;
  return ROLES_CREATABLE_ETAB_ADMIN.includes(targetUser.role)
    || targetUser.role === 'responsable';
}

module.exports = {
  ROLE_ADMIN_ETABLISSEMENT,
  STAFF_ROLES,
  ETAB_STAFF_ROLES,
  ROLES_CREATABLE_PLATFORM,
  ROLES_CREATABLE_ETAB_ADMIN,
  isPlatformAdmin,
  isAdminEtablissement,
  isEtabScopedStaff,
  canManageEtabMembres,
  rolesCreatablesMembres,
  canManageTargetMembre,
};
