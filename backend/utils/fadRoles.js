/**
 * Périmètre FAD : rôles et filtres dossiers / demandes / formations.
 */

const FAD_STAFF_ROLES = ['responsable_fad', 'agent_fad'];

function isFadStaffRole(role) {
  return FAD_STAFF_ROLES.includes(role);
}

function isFadOnlyUser(user) {
  return user && isFadStaffRole(user.role);
}

/**
 * Qui peut voir / traiter un dossier selon modalité FAD vs présentiel.
 * - admin / admin_etablissement : tout
 * - responsable_fad / agent_fad : FAD uniquement
 * - autre staff étab : présentiel uniquement (pas de FAD)
 */
function userPeutVoirDossierParModalite(user, dossier) {
  if (!user || !dossier) return false;
  if (user.role === 'admin' || user.role === 'admin_etablissement') return true;
  const isFad = dossier.type_formation === 'en_ligne';
  if (isFadOnlyUser(user)) return isFad;
  // Staff présentiel : exclure FAD
  if (isFad) return false;
  return true;
}

function filterDossiersParModaliteRole(user, dossiers) {
  return (dossiers || []).filter((d) => userPeutVoirDossierParModalite(user, d));
}

function demandeEstFad(demande) {
  if (!demande) return false;
  if (demande.type_formation) return demande.type_formation === 'en_ligne';
  return false;
}

function userPeutVoirDemandeParModalite(user, demande) {
  if (!user || !demande) return false;
  if (user.role === 'admin' || user.role === 'admin_etablissement') return true;
  const isFad = demandeEstFad(demande);
  if (isFadOnlyUser(user)) return isFad;
  if (isFad) return false;
  return true;
}

function filterDemandesParModaliteRole(user, demandes) {
  return (demandes || []).filter((d) => userPeutVoirDemandeParModalite(user, d));
}

function formationEstFad(formation) {
  return formation && formation.type === 'en_ligne';
}

function userPeutGererFormation(user, formation) {
  if (!user || !formation) return false;
  if (user.role === 'admin' || user.role === 'admin_etablissement') return true;
  if (isFadOnlyUser(user)) return formationEstFad(formation);
  // Responsable présentiel / autres : pas de FAD
  if (formationEstFad(formation)) return false;
  return true;
}

module.exports = {
  FAD_STAFF_ROLES,
  isFadStaffRole,
  isFadOnlyUser,
  userPeutVoirDossierParModalite,
  filterDossiersParModaliteRole,
  demandeEstFad,
  userPeutVoirDemandeParModalite,
  filterDemandesParModaliteRole,
  formationEstFad,
  userPeutGererFormation,
};
