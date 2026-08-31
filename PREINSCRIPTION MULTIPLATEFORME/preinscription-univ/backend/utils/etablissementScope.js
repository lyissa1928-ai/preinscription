/**
 * Règles d’accès par établissement (multi-tenant) — logique pure, testable sans HTTP.
 */

function getFormationIdsForEtab(formations, etabId) {
  if (!etabId) return null;
  return (formations || []).filter((f) => f.etablissement_id === etabId).map((f) => f.id);
}

function dossierAppartientAEtablissement(dossier, etabId, formationsById) {
  if (!etabId) return true;
  if (!dossier) return false;
  const eid = Number(etabId);
  if (dossier.etablissement_id != null && Number(dossier.etablissement_id) === eid) return true;
  if (dossier.formation_id) {
    const f = formationsById
      ? formationsById.get(dossier.formation_id) || formationsById.get(Number(dossier.formation_id))
      : null;
    return f && Number(f.etablissement_id) === eid;
  }
  return false;
}

function demandeAppartientAEtablissement(demande, etabId, formationIds) {
  if (!etabId) return true;
  if (!demande) return false;
  if (demande.etablissement_id === etabId) return true;
  if (!demande.etablissement_id && demande.formation_id && (formationIds || []).includes(demande.formation_id)) {
    return true;
  }
  return false;
}

function buildFormationsMap(formations) {
  const m = new Map();
  (formations || []).forEach((f) => {
    if (f && f.id != null) m.set(f.id, f);
  });
  return m;
}

module.exports = {
  getFormationIdsForEtab,
  dossierAppartientAEtablissement,
  demandeAppartientAEtablissement,
  buildFormationsMap,
};
