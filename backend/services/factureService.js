const db = require('../database/db');
const { snapshotFromFormation } = require('../utils/etablissementSnapshot');
const { buildLignesForfaitAnnuel } = require('../utils/formationTarifs');

function genererNumeroFacture() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 90000) + 10000);
  return `FP-${year}-${rand}`;
}

/**
 * Met à jour les lignes et montants HT/TTC d'une facture dossier selon la formation actuelle.
 */
function syncFactureMontantsFromFormation(facture, formation) {
  const tarif = buildLignesForfaitAnnuel(formation);
  const tva_taux = 0;
  const montant_ht = tarif.montant_ht;
  const montant_tva = Math.round(montant_ht * tva_taux);
  const montant_ttc = montant_ht + montant_tva;
  const lignes = tarif.lignes.map((L) => ({
    description: L.designation,
    quantite: 1,
    prix_unitaire: L.montant,
    total: L.montant,
  }));
  return {
    lignes,
    lignes_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
    montant_ht,
    tva_taux: tva_taux * 100,
    montant_tva,
    montant_ttc,
    formation_snapshot: {
      titre: formation.titre,
      type: formation.type,
      duree: formation.duree,
      duree_mois: tarif.duree_mois,
      ville: formation.ville,
      niveau_requis: formation.niveau_requis,
      mensualite: formation.mensualite,
      frais_inscription: formation.frais_inscription,
    },
  };
}

/**
 * Recalcule et enregistre les montants d'une facture dossier à partir de son id.
 */
function syncStoredFactureById(factureId) {
  const fid = parseInt(factureId, 10);
  if (Number.isNaN(fid)) return null;
  const facture = db.get('factures').find({ id: fid }).value();
  if (!facture) return null;
  const dossier = facture.dossier_id ? db.get('dossiers').find({ id: facture.dossier_id }).value() : null;
  const formation = dossier?.formation_id ? db.get('formations').find({ id: dossier.formation_id }).value() : null;
  if (!formation) return facture;
  const synced = syncFactureMontantsFromFormation(facture, formation);
  db.get('factures').find({ id: facture.id }).assign(synced).write();
  return { ...facture, ...synced };
}

/**
 * Crée une facture proforma liée au dossier si elle n'existe pas encore.
 * @returns {object} facture (nouvelle ou existante)
 */
function genererOuRecupererFactureDossier(dossierId) {
  const id = parseInt(dossierId, 10);
  const dossierRow = db.get('dossiers').find({ id }).value();
  if (!dossierRow) return null;

  const formation = db.get('formations').find({ id: dossierRow.formation_id }).value();
  if (!formation) return null;

  const etabSnap = snapshotFromFormation(formation);

  const existing = db.get('factures').find({ dossier_id: id }).value();
  if (existing) {
    if (!existing.etablissement_snapshot && etabSnap) {
      db.get('factures').find({ id: existing.id }).assign({ etablissement_snapshot: etabSnap }).write();
    }
    if (existing.etablissement_snapshot && etabSnap) {
      const cur = existing.etablissement_snapshot;
      const needMerge =
        (!cur.cachet_url && etabSnap.cachet_url) ||
        (!cur.logo_url && etabSnap.logo_url) ||
        (etabSnap.telephone && cur.telephone !== etabSnap.telephone) ||
        (etabSnap.compte_bancaire && cur.compte_bancaire !== etabSnap.compte_bancaire);
      if (needMerge) {
        const merged = { ...cur, ...etabSnap };
        db.get('factures').find({ id: existing.id }).assign({ etablissement_snapshot: merged }).write();
      }
    }
    const current = db.get('factures').find({ id: existing.id }).value();
    const synced = syncFactureMontantsFromFormation(current, formation);
    db.get('factures').find({ id: existing.id }).assign(synced).write();
    return { ...current, ...synced };
  }

  const etudiant = db.get('utilisateurs').find({ id: dossierRow.etudiant_id }).value();
  if (!etudiant) return null;

  const tarif = buildLignesForfaitAnnuel(formation);
  const tva_taux = 0;
  const montant_ht = tarif.montant_ht;
  const montant_tva = Math.round(montant_ht * tva_taux);
  const montant_ttc = montant_ht + montant_tva;

  const fid = db.nextId('factures');
  const facture = {
    id: fid,
    numero: genererNumeroFacture(),
    dossier_id: id,
    etudiant_id: dossierRow.etudiant_id,
    formation_id: formation.id,
    date_emission: new Date().toISOString(),
    date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    lignes: tarif.lignes.map((L) => ({
      description: L.designation,
      quantite: 1,
      prix_unitaire: L.montant,
      total: L.montant,
    })),
    lignes_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
    montant_ht,
    tva_taux: tva_taux * 100,
    montant_tva,
    montant_ttc,
    statut: 'emise',
    etudiant_snapshot: {
      nom: etudiant.nom,
      prenom: etudiant.prenom,
      email: etudiant.email,
      telephone: dossierRow.telephone,
      adresse: dossierRow.adresse,
      nationalite: dossierRow.nationalite
    },
    formation_snapshot: {
      titre: formation.titre,
      type: formation.type,
      duree: formation.duree,
      duree_mois: tarif.duree_mois,
      ville: formation.ville,
      niveau_requis: formation.niveau_requis,
      mensualite: formation.mensualite,
      frais_inscription: formation.frais_inscription,
    },
    etablissement_snapshot: etabSnap,
    created_at: new Date().toISOString()
  };

  db.get('factures').push(facture).write();
  return facture;
}

module.exports = {
  genererOuRecupererFactureDossier,
  genererNumeroFacture,
  syncFactureMontantsFromFormation,
  syncStoredFactureById,
};
