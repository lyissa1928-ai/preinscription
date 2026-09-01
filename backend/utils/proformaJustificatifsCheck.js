/**
 * Vérifie que la demande proforma contient les pièces attendues (chemins enregistrés).
 * - Sans compte (public_distant) : pièce d’identité + diplôme
 * - Compte candidat : diplôme + relevé + document formation
 */
function demandeProformaJustificatifsComplets(demande) {
  if (!demande || !demande.justificatifs) return false
  const j = demande.justificatifs
  const pieceOk = (v) => Boolean(v && String(v).trim().length > 0)

  if (demande.source === 'public_distant' || pieceOk(j.identite)) {
    return pieceOk(j.identite) && pieceOk(j.diplome)
  }

  return pieceOk(j.diplome) && pieceOk(j.releve) && pieceOk(j.formation)
}

module.exports = { demandeProformaJustificatifsComplets }
