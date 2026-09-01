/** Validité des factures proforma / définitives émises : 1 an à partir de la date d'émission. */
const FACTURE_VALIDITE_JOURS = 365;
const FACTURE_VALIDITE_MS = FACTURE_VALIDITE_JOURS * 24 * 60 * 60 * 1000;

function dateEcheanceFacture(dateEmission) {
  const base = dateEmission ? new Date(dateEmission) : new Date();
  const t = base.getTime();
  if (Number.isNaN(t)) return new Date(Date.now() + FACTURE_VALIDITE_MS).toISOString();
  return new Date(t + FACTURE_VALIDITE_MS).toISOString();
}

/** Prolonge l'échéance si elle est absente ou inférieure à 1 an après émission. */
function syncDateEcheanceFacture(facture) {
  if (!facture) return null;
  const emission = facture.date_emission || facture.created_at;
  const expected = dateEcheanceFacture(emission);
  const cur = facture.date_echeance ? new Date(facture.date_echeance).getTime() : 0;
  const exp = new Date(expected).getTime();
  if (!cur || cur < exp - 86400000) return expected;
  return facture.date_echeance;
}

module.exports = {
  FACTURE_VALIDITE_JOURS,
  FACTURE_VALIDITE_MS,
  dateEcheanceFacture,
  syncDateEcheanceFacture,
};
