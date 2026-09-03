/**
 * Accès staff établissement aux factures / dossiers liés.
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
  if (user.role === 'admin') return true;
  if (!STAFF_ETAB_FACTURE_ROLES.includes(user.role)) return false;
  return dossierDansEtablissementUtilisateur(dossier, user, db);
}

module.exports = {
  STAFF_ETAB_FACTURE_ROLES,
  dossierDansEtablissementUtilisateur,
  staffEtabPeutVoirDossier,
};
