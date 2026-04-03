const DOSSIER_STATUSES = ['en_attente', 'en_cours', 'accepte', 'refuse'];

// Transitions autorisées (alignées frontend AdminDossier / ResponsableDossier).
// Accepter depuis « en_attente » : parcours métier souvent direct après contrôle des pièces.
const DOSSIER_TRANSITIONS = {
  en_attente: ['en_attente', 'en_cours', 'refuse', 'accepte'],
  en_cours: ['en_cours', 'accepte', 'refuse'],
  accepte: ['accepte'],
  refuse: ['refuse', 'en_cours'],
};

function canTransitionDossierStatus(currentStatus, nextStatus) {
  if (!DOSSIER_STATUSES.includes(nextStatus)) return false;
  const current = DOSSIER_STATUSES.includes(currentStatus) ? currentStatus : 'en_attente';
  return (DOSSIER_TRANSITIONS[current] || []).includes(nextStatus);
}

function requiresRejectionComment(nextStatus) {
  return nextStatus === 'refuse';
}

module.exports = {
  DOSSIER_STATUSES,
  DOSSIER_TRANSITIONS,
  canTransitionDossierStatus,
  requiresRejectionComment,
};

