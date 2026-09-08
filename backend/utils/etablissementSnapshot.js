const db = require('../database/db');

function isEnLigneModality(opts) {
  if (!opts) return false;
  const t = String(opts.modality || opts.type || '').trim().toLowerCase();
  return t === 'en_ligne' || t === 'fad' || t === 'distance';
}

function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Sur facture FAD : téléphone + e-mail FAD (fallback présentiel si vide).
 * Tout le reste (adresse, NINEA, RC, banque, IBAN…) = coordonnées présentiel / établissement.
 */
function pickFadPhoneOrEmail(etab, fadKey, presKey, enLigne) {
  if (enLigne) {
    const fadVal = str(etab[fadKey]);
    if (fadVal) return fadVal;
  }
  return str(etab[presKey]);
}

function snapshotFromEtab(etab, opts = {}) {
  if (!etab) return null;
  const enLigne = isEnLigneModality(opts);
  return {
    nom: etab.nom,
    logo_url: etab.logo_url || null,
    cachet_url: etab.cachet_url || null,
    couleur_primaire: etab.couleur_primaire || '#1e40af',
    couleur_secondaire: etab.couleur_secondaire || '#3b82f6',
    adresse: str(etab.adresse),
    telephone: pickFadPhoneOrEmail(etab, 'telephone_fad', 'telephone', enLigne),
    email_contact: pickFadPhoneOrEmail(etab, 'email_contact_fad', 'email_contact', enLigne),
    site_web: etab.site_web || '',
    ninea: str(etab.ninea),
    rc: str(etab.rc),
    arrete: str(etab.arrete),
    compte_bancaire: str(etab.compte_bancaire),
    banque: str(etab.banque),
    iban: str(etab.iban),
    swift: str(etab.swift),
    signataire_nom: etab.signataire_nom || '',
    signataire_fonction: etab.signataire_fonction || '',
  };
}

function snapshotFromEtablissementId(etabId, opts = {}) {
  if (etabId == null || etabId === '') return null;
  const id = parseInt(String(etabId), 10);
  if (Number.isNaN(id)) return null;
  const etab = db.get('etablissements').find({ id }).value();
  return snapshotFromEtab(etab, opts);
}

function snapshotFromFormation(formation) {
  if (!formation?.etablissement_id) return null;
  const etab = db.get('etablissements').find({ id: formation.etablissement_id }).value();
  return snapshotFromEtab(etab, { type: formation.type });
}

module.exports = {
  snapshotFromEtab,
  snapshotFromEtablissementId,
  snapshotFromFormation,
  isEnLigneModality,
};
