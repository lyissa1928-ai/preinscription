/** Rôle « administrateur établissement » — gestion du staff de son établissement uniquement. */
const ROLE_ADMIN_ETABLISSEMENT = 'admin_etablissement';

/** Directeur : vision globale multi-établissements (sans rattachement étab.). */
const ROLE_DIRECTEUR = 'directeur';

const STAFF_ROLES = [
  'admin',
  ROLE_DIRECTEUR,
  ROLE_ADMIN_ETABLISSEMENT,
  'responsable',
  'responsable_fad',
  'agent_fad',
  'agent_admin',
  'comptable',
  'controleur_qualite',
];

/** Comptes staff rattachés à un établissement (hors admin / directeur globaux). */
const ETAB_STAFF_ROLES = STAFF_ROLES.filter((r) => r !== 'admin' && r !== ROLE_DIRECTEUR);

/** Création par l’admin plateforme (tous rôles staff). */
const ROLES_CREATABLE_PLATFORM = [...STAFF_ROLES];

/** Création par l’administrateur établissement (pas d’autre admin étab.). */
const ROLES_CREATABLE_ETAB_ADMIN = [
  'responsable',
  'responsable_fad',
  'agent_fad',
  'agent_admin',
  'comptable',
  'controleur_qualite',
];

/** Création limitée : Responsable FAD → Agents FAD uniquement. */
const ROLES_CREATABLE_RESPONSABLE_FAD = ['agent_fad'];

function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

function isDirecteur(user) {
  return user?.role === ROLE_DIRECTEUR;
}

/** Admin plateforme ou Directeur (vue globale). */
function isPlatformGlobal(user) {
  return isPlatformAdmin(user) || isDirecteur(user);
}

function isAdminEtablissement(user) {
  return user?.role === ROLE_ADMIN_ETABLISSEMENT;
}

/** Établissements administrés (multi : présentiel + FAD). */
function administeredEtablissementIds(user) {
  if (!isAdminEtablissement(user)) return [];
  const ids = Array.isArray(user.administre_etablissement_ids)
    ? user.administre_etablissement_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (user.etablissement_id != null) {
    const p = Number(user.etablissement_id);
    if (Number.isFinite(p) && !ids.includes(p)) ids.unshift(p);
  }
  return [...new Set(ids)];
}

function userAdministersEtablissement(user, etabId) {
  if (!user || etabId == null) return false;
  if (isPlatformAdmin(user)) return true;
  if (!isAdminEtablissement(user)) return false;
  return administeredEtablissementIds(user).includes(Number(etabId));
}

function isEtabScopedStaff(user) {
  return user && ETAB_STAFF_ROLES.includes(user.role);
}

function isResponsableFad(user) {
  return user?.role === 'responsable_fad';
}

/** Gestion des membres : admin plateforme, admin étab., ou responsable FAD (agents FAD seulement). */
function canManageEtabMembres(user, etabId) {
  if (isPlatformAdmin(user)) return true;
  if (userAdministersEtablissement(user, etabId)) return true;
  if (isResponsableFad(user) && Number(user.etablissement_id) === Number(etabId)) {
    return true;
  }
  return false;
}

/** Modifier l’identité (logo, contacts, banque…) de l’établissement. */
function canEditEtabIdentite(user, etabId) {
  if (isPlatformAdmin(user)) return true;
  return userAdministersEtablissement(user, etabId);
}

function rolesCreatablesMembres(user) {
  if (isPlatformAdmin(user)) {
    return ROLES_CREATABLE_PLATFORM.filter((r) => r !== 'admin' && r !== ROLE_DIRECTEUR);
  }
  if (isAdminEtablissement(user)) return ROLES_CREATABLE_ETAB_ADMIN;
  if (isResponsableFad(user)) return ROLES_CREATABLE_RESPONSABLE_FAD;
  return [];
}

/**
 * L’acteur peut-il modifier / désactiver ce membre ?
 * @param {object} etab  établissement (id, responsable_id)
 */
function canManageTargetMembre(actor, targetUser, etab) {
  if (!targetUser || !etab) return false;
  if (Number(targetUser.etablissement_id) !== Number(etab.id)) return false;
  if (targetUser.role === 'etudiant') return false;
  if (isPlatformAdmin(actor)) return true;
  if (isResponsableFad(actor)) {
    if (Number(actor.etablissement_id) !== Number(etab.id)) return false;
    return targetUser.role === 'agent_fad';
  }
  if (!isAdminEtablissement(actor)) return false;
  if (!userAdministersEtablissement(actor, etab.id)) return false;
  if (Number(actor.id) === Number(targetUser.id)) return false;
  if (targetUser.role === ROLE_ADMIN_ETABLISSEMENT) return false;
  if (targetUser.role === 'admin') return false;
  return ROLES_CREATABLE_ETAB_ADMIN.includes(targetUser.role)
    || targetUser.role === 'responsable';
}

module.exports = {
  ROLE_ADMIN_ETABLISSEMENT,
  ROLE_DIRECTEUR,
  STAFF_ROLES,
  ETAB_STAFF_ROLES,
  ROLES_CREATABLE_PLATFORM,
  ROLES_CREATABLE_ETAB_ADMIN,
  ROLES_CREATABLE_RESPONSABLE_FAD,
  isPlatformAdmin,
  isDirecteur,
  isPlatformGlobal,
  isAdminEtablissement,
  isResponsableFad,
  isEtabScopedStaff,
  administeredEtablissementIds,
  userAdministersEtablissement,
  canManageEtabMembres,
  canEditEtabIdentite,
  rolesCreatablesMembres,
  canManageTargetMembre,
};
