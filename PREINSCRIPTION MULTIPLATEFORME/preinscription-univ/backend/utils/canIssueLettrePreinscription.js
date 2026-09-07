/**
 * Lettre de préinscription — candidats acceptés en ligne avec compte étudiant.
 * Refus : guichet (source staff) ou dossier sans etudiant_id.
 */
const { isDossierAcceptePourLettre } = require('./dossierLettreEligible');

function canIssueLettrePreinscription(dossier) {
  if (!dossier) return false;
  if (dossier.source === 'staff') return false;
  if (!dossier.etudiant_id) return false;
  return isDossierAcceptePourLettre(dossier.statut);
}

module.exports = { canIssueLettrePreinscription };
