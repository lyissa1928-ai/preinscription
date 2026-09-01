/**
 * Visibilité des dossiers de préinscription.
 * Un dossier lié à un compte étudiant supprimé (etudiant_id orphelin) n’est plus affiché.
 * Les dossiers guichet (sans etudiant_id) restent visibles (identité sur le dossier).
 */
const db = require('../database/db');

function buildUtilisateursById(utilisateurs) {
  const list = utilisateurs || db.get('utilisateurs').value() || [];
  return new Map(list.map((u) => [Number(u.id), u]));
}

/** @param {object} dossier @param {Map<number, object>} [utilisateursById] */
function isDossierAffichable(dossier, utilisateursById) {
  if (!dossier) return false;
  const eid = dossier.etudiant_id;
  if (eid == null || eid === '' || Number(eid) === 0) return true;
  const map = utilisateursById || buildUtilisateursById();
  const u = map.get(Number(eid));
  if (!u) return false;
  if (u.role !== 'etudiant') return false;
  return true;
}

function filterDossiersAffichables(dossiers, utilisateurs) {
  const byId = buildUtilisateursById(utilisateurs);
  return (dossiers || []).filter((d) => isDossierAffichable(d, byId));
}

function assertDossierAffichable(dossier, utilisateurs) {
  if (!dossier) {
    return { ok: false, status: 404, message: 'Dossier non trouvé' };
  }
  if (!isDossierAffichable(dossier, buildUtilisateursById(utilisateurs))) {
    return { ok: false, status: 404, message: 'Dossier non trouvé' };
  }
  return { ok: true };
}

module.exports = {
  buildUtilisateursById,
  isDossierAffichable,
  filterDossiersAffichables,
  assertDossierAffichable,
};
