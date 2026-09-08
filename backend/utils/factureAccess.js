/**
 * Accès staff établissement aux factures / dossiers liés.
 * Téléchargement / consultation documentaire officielle : réservé au personnel autorisé.
 */
const STAFF_ETAB_FACTURE_ROLES = [
  'admin_etablissement',
  'responsable',
  'responsable_fad',
  'agent_fad',
  'comptable',
  'agent_admin',
  'controleur_qualite',
];

const ROLE_DIRECTEUR = 'directeur';

function dossierDansEtablissementUtilisateur(dossier, user, db) {
  if (!user?.etablissement_id) return false;
  const eid = Number(user.etablissement_id);
  if (dossier.etablissement_id != null && Number(dossier.etablissement_id) === eid) return true;
  if (dossier.formation_id && db) {
    const f = db.get('formations').find({ id: dossier.formation_id }).value();
    return f && Number(f.etablissement_id) === eid;
  }
  return false;
}

function staffEtabPeutVoirDossier(user, dossier, db) {
  if (!user || !dossier) return false;
  if (user.role === 'admin' || user.role === ROLE_DIRECTEUR) return true;
  if (!STAFF_ETAB_FACTURE_ROLES.includes(user.role)) return false;
  return dossierDansEtablissementUtilisateur(dossier, user, db);
}

/** Personnel autorisé à consulter / télécharger une facture officielle. */
function isStaffFactureRole(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === ROLE_DIRECTEUR) return true;
  return STAFF_ETAB_FACTURE_ROLES.includes(user.role);
}

/**
 * Accès documentaire facture dossier : staff uniquement (pas l’étudiant propriétaire).
 */
function peutAccederFactureDocumentaire(user, dossier, db) {
  if (!user || !dossier) return false;
  return staffEtabPeutVoirDossier(user, dossier, db);
}

module.exports = {
  STAFF_ETAB_FACTURE_ROLES,
  dossierDansEtablissementUtilisateur,
  staffEtabPeutVoirDossier,
  isStaffFactureRole,
  peutAccederFactureDocumentaire,
};
