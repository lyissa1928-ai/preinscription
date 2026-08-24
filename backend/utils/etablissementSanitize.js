/**
 * Filtrage des champs sensibles d'un établissement (Lot 1 sécurité).
 *
 * Les coordonnées bancaires ne doivent jamais être exposées aux rôles autres
 * que l'admin plateforme (les factures passent par leurs endpoints scopés).
 */
const ETAB_ADMIN_ONLY_FIELDS = ['compte_bancaire', 'banque', 'iban', 'swift'];

/** Retire les champs bancaires. Ne mute pas l'objet source. */
function stripEtabSensitiveFields(etab) {
  const out = { ...etab };
  for (const k of ETAB_ADMIN_ONLY_FIELDS) delete out[k];
  return out;
}

/** Renvoie l'établissement complet pour l'admin, filtré sinon. */
function etabForRole(etab, role) {
  return role === 'admin' ? { ...etab } : stripEtabSensitiveFields(etab);
}

module.exports = { ETAB_ADMIN_ONLY_FIELDS, stripEtabSensitiveFields, etabForRole };
