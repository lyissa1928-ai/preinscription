/**
 * Lettre de préinscription — réservée aux candidats étrangers qui :
 * - ont un compte (etudiant_id) ;
 * - ont déposé une préinscription en ligne (pas guichet / source staff) ;
 * - ont obtenu l’acceptation du dossier.
 */
const { isDossierAcceptePourLettre } = require('./dossierLettreEligible');
const { inferIsForeignerFromNationalite } = require('./preinscriptionDocumentRules');

function canIssueLettrePreinscription(dossier) {
  if (!dossier) return false;
  if (dossier.source === 'staff') return false;
  if (!dossier.etudiant_id) return false;
  if (!isDossierAcceptePourLettre(dossier.statut)) return false;
  const foreign = inferIsForeignerFromNationalite(dossier.nationalite);
  return foreign === true;
}

module.exports = { canIssueLettrePreinscription };
