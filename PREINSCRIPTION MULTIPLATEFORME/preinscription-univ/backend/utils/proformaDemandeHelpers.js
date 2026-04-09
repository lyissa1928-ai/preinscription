/**
 * Règles d’accès public à la facture proforma (PDF / GET).
 * Uniquement après acceptation explicite par le service pédagogique / staff établissement ou l’admin.
 */
function isFactureProformaConsultablePublique(demande) {
  if (!demande) return false;
  if (demande.statut !== 'acceptee') return false;
  const fac = demande.facture;
  return !!(fac && fac.numero);
}

module.exports = { isFactureProformaConsultablePublique };
