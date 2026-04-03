/**
 * Indique si le statut dossier autorise lettre / attestation (tolère espaces, casse, variante accentuée).
 */
function isDossierAcceptePourLettre(statut) {
  const s = String(statut ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return s === 'accepte' || s === 'accepted';
}

module.exports = { isDossierAcceptePourLettre };
