/**
 * Un document officiel (lettre / attestation) peut être émis si :
 * - le dossier est accepté, ou
 * - il a été créé au guichet (source staff).
 */
const { isDossierAcceptePourLettre } = require('./dossierLettreEligible');

function canIssueOfficialDocs(dossier) {
  if (!dossier) return false;
  if (dossier.source === 'staff') return true;
  return isDossierAcceptePourLettre(dossier.statut);
}

module.exports = { canIssueOfficialDocs };
