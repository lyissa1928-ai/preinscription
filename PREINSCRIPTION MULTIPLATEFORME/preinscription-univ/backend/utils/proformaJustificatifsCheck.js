/**
 * Vérifie que la demande proforma contient les trois pièces attendues (chemins enregistrés).
 */
function demandeProformaJustificatifsComplets(demande) {
  if (!demande || !demande.justificatifs) return false
  const j = demande.justificatifs
  const pieceOk = (v) => Boolean(v && String(v).trim().length > 0)
  return pieceOk(j.diplome) && pieceOk(j.releve) && pieceOk(j.formation)
}

module.exports = { demandeProformaJustificatifsComplets }
