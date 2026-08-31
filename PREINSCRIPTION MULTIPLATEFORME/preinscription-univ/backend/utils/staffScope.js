/**
 * Périmètre établissement pour rôles staff (comptable, agent_admin, etc.).
 * Centralise filtrage et assertions IDOR — logique pure + helpers req.
 */

const db = require('../database/db');
const {
  getFormationIdsForEtab,
  dossierAppartientAEtablissement,
  demandeAppartientAEtablissement,
  buildFormationsMap,
} = require('./etablissementScope');

function getScopeContext(user) {
  const formations = db.get('formations').value() || [];
  const etabId = user && user.role === 'admin' ? null : user?.etablissement_id ?? null;
  const formationIds = getFormationIdsForEtab(formations, etabId);
  const formationsById = buildFormationsMap(formations);
  return { etabId, formationIds, formationsById };
}

function filterDossiersForUser(user, dossiers) {
  const { etabId, formationsById } = getScopeContext(user);
  if (!etabId) return dossiers || [];
  return (dossiers || []).filter((d) => dossierAppartientAEtablissement(d, etabId, formationsById));
}

function filterDemandesForUser(user, demandes) {
  const { etabId, formationIds } = getScopeContext(user);
  if (!etabId) return demandes || [];
  return (demandes || []).filter((d) => demandeAppartientAEtablissement(d, etabId, formationIds));
}

function filterFormationsForUser(user, formations) {
  const { etabId } = getScopeContext(user);
  if (!etabId) return formations || [];
  return (formations || []).filter((f) => f.etablissement_id === etabId);
}

function assertDossierForUser(user, dossier) {
  if (!dossier) {
    return { ok: false, status: 404, message: 'Dossier non trouvé' };
  }
  if (user?.role === 'admin') return { ok: true };
  const { etabId, formationsById } = getScopeContext(user);
  if (!etabId) {
    return { ok: false, status: 403, message: 'Compte non rattaché à un établissement.' };
  }
  if (!dossierAppartientAEtablissement(dossier, etabId, formationsById)) {
    return { ok: false, status: 403, message: 'Ce dossier ne concerne pas votre établissement.' };
  }
  return { ok: true };
}

function assertDemandeForUser(user, demande) {
  if (!demande) {
    return { ok: false, status: 404, message: 'Demande introuvable.' };
  }
  if (user?.role === 'admin') return { ok: true };
  const { etabId, formationIds } = getScopeContext(user);
  if (!etabId) {
    return { ok: false, status: 403, message: 'Compte non rattaché à un établissement.' };
  }
  if (!demandeAppartientAEtablissement(demande, etabId, formationIds)) {
    return { ok: false, status: 403, message: 'Cette demande ne concerne pas votre établissement.' };
  }
  return { ok: true };
}

function requireStaffEtablissement(user, res) {
  if (user?.role === 'admin') return true;
  if (user?.etablissement_id != null) return true;
  res.status(403).json({ message: 'Compte non rattaché à un établissement.' });
  return false;
}

module.exports = {
  getScopeContext,
  filterDossiersForUser,
  filterDemandesForUser,
  filterFormationsForUser,
  assertDossierForUser,
  assertDemandeForUser,
  requireStaffEtablissement,
};
