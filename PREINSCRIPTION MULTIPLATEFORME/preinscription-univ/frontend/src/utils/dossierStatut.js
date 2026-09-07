/** Aligné sur le backend : dossier accepté pour attestation / facture. */
export function isDossierAcceptePourDocuments(statut) {
  const s = String(statut ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return s === 'accepte' || s === 'accepted'
}

/**
 * Lettre : dossiers en ligne acceptés (hors saisie guichet / source staff).
 */
export function canShowLettrePreinscription(dossier) {
  if (!dossier) return false
  if (dossier.source === 'staff') return false
  if (!dossier.etudiant_id) return false
  if (!isDossierAcceptePourDocuments(dossier.statut)) return false
  return true
}
