/** Aligné sur le backend : dossier considéré comme accepté pour lettre / attestation. */
export function isDossierAcceptePourDocuments(statut) {
  const s = String(statut ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return s === 'accepte' || s === 'accepted'
}
