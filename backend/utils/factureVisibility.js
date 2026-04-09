/**
 * Facture « supprimée » par le staff : soft-delete (deleted_at).
 * Elle ne doit plus apparaître pour les étudiants ni pour les autres listes métier.
 */
function isFactureSupprimee(f) {
  return !!(f && f.deleted_at)
}

function isFactureVisiblePourConsultation(f) {
  return f && !f.deleted_at
}

module.exports = {
  isFactureSupprimee,
  isFactureVisiblePourConsultation,
}
