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
 * Lettre : candidats étrangers, compte + préinscription en ligne, dossier accepté.
 * (Pas pour les walk-in / source staff.)
 */
export function canShowLettrePreinscription(dossier, inferIsForeigner) {
  if (!dossier) return false
  if (dossier.source === 'staff') return false
  if (!dossier.etudiant_id) return false
  if (!isDossierAcceptePourDocuments(dossier.statut)) return false
  if (typeof inferIsForeigner !== 'function') return false
  return inferIsForeigner(dossier.nationalite) === true
}
