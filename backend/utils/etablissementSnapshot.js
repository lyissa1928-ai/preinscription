const db = require('../database/db');

function snapshotFromEtab(etab) {
  if (!etab) return null;
  return {
    nom: etab.nom,
    logo_url: etab.logo_url || null,
    cachet_url: etab.cachet_url || null,
    couleur_primaire: etab.couleur_primaire || '#1e40af',
    couleur_secondaire: etab.couleur_secondaire || '#3b82f6',
    adresse: etab.adresse || '',
    telephone: etab.telephone || '',
    email_contact: etab.email_contact || '',
    site_web: etab.site_web || '',
    ninea: etab.ninea || '',
    rc: etab.rc || '',
    arrete: etab.arrete || '',
    compte_bancaire: etab.compte_bancaire || '',
    banque: etab.banque || '',
    iban: etab.iban || '',
    swift: etab.swift || '',
    signataire_nom: etab.signataire_nom || '',
    signataire_fonction: etab.signataire_fonction || '',
  };
}

function snapshotFromEtablissementId(etabId) {
  if (etabId == null || etabId === '') return null;
  const id = parseInt(String(etabId), 10);
  if (Number.isNaN(id)) return null;
  const etab = db.get('etablissements').find({ id }).value();
  return snapshotFromEtab(etab);
}

function snapshotFromFormation(formation) {
  if (!formation?.etablissement_id) return null;
  return snapshotFromEtablissementId(formation.etablissement_id);
}

module.exports = {
  snapshotFromEtab,
  snapshotFromEtablissementId,
  snapshotFromFormation,
};
