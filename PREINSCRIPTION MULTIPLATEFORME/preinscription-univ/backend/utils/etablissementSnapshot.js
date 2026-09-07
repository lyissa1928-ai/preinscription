const db = require('../database/db');

function isEnLigneModality(opts) {
  if (!opts) return false;
  const t = String(opts.modality || opts.type || '').trim().toLowerCase();
  return t === 'en_ligne' || t === 'fad' || t === 'distance';
}

function pickContactField(etab, fadKey, presKey, enLigne) {
  if (enLigne) {
    const fadVal = etab[fadKey];
    if (fadVal != null && String(fadVal).trim() !== '') return String(fadVal).trim();
  }
  const presVal = etab[presKey];
  return presVal != null ? String(presVal).trim() : '';
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
    adresse: pickContactField(etab, 'adresse_fad', 'adresse', enLigne),
    telephone: pickContactField(etab, 'telephone_fad', 'telephone', enLigne),
    email_contact: pickContactField(etab, 'email_contact_fad', 'email_contact', enLigne),
    site_web: etab.site_web || '',
    ninea: etab.ninea || '',
    rc: etab.rc || '',
    arrete: etab.arrete || '',
    compte_bancaire: pickContactField(etab, 'compte_bancaire_fad', 'compte_bancaire', enLigne),
    banque: pickContactField(etab, 'banque_fad', 'banque', enLigne),
    iban: pickContactField(etab, 'iban_fad', 'iban', enLigne),
    swift: pickContactField(etab, 'swift_fad', 'swift', enLigne),
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
