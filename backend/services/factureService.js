const db = require('../database/db');
const { snapshotFromFormation } = require('../utils/etablissementSnapshot');
const { buildLignesForfaitAnnuel, getDureeMoisEffectif } = require('../utils/formationTarifs');
const { isFactureSupprimee } = require('../utils/factureVisibility');

function genererNumeroFacture() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 90000) + 10000);
  return `FP-${year}-${rand}`;
}

/** Snapshot formation : distingue durée du cycle et durée réelle du niveau / formation. */
function buildFormationSnapshot(formation, tarif) {
  const mois = tarif?.duree_mois != null ? tarif.duree_mois : getDureeMoisEffectif(formation);
  let duree_cycle = null;
  if (formation?.filiere_id != null) {
    const fil = db.get('filieres').find({ id: formation.filiere_id }).value();
    if (fil?.duree_cycle) duree_cycle = String(fil.duree_cycle).trim();
  }
  const duree_formation =
    mois > 0 ? `${mois} mois` : (formation?.duree ? String(formation.duree).trim() : null);
  return {
    titre: formation.titre,
    type: formation.type,
    niveau: formation.niveau || null,
    niveau_requis: formation.niveau_requis || null,
    duree: formation.duree || null,
    duree_mois: mois,
    duree_formation,
    duree_cycle,
    ville: formation.ville || null,
    mensualite: formation.mensualite,
    frais_inscription: formation.frais_inscription,
  };
}

function mapLignesFacture(tarif) {
  return tarif.lignes.map((L) => ({
    description: L.designation,
    quantite: 1,
    prix_unitaire: L.montant,
    total: L.kind === 'mensualite_unitaire' ? (L.total_mensualites || L.montant) : L.montant,
    kind: L.kind || null,
    duree_mois: L.duree_mois || null,
    montant_unitaire: L.kind === 'mensualite_unitaire' ? L.montant : undefined,
  }));
}

function syncFactureMontantsFromFormation(facture, formation) {
  const tarif = buildLignesForfaitAnnuel(formation);
  const tva_taux = 0;
  const montant_ht = tarif.montant_ht;
  const montant_tva = Math.round(montant_ht * tva_taux);
  const montant_ttc = montant_ht + montant_tva;
  return {
    lignes: mapLignesFacture(tarif),
    lignes_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
    montant_ht,
    tva_taux: tva_taux * 100,
    montant_tva,
    montant_ttc,
    montant_total_a_payer: montant_ttc + (tarif.montant_supplementaires || 0),
    formation_snapshot: buildFormationSnapshot(formation, tarif),
  };
}

function syncStoredFactureById(factureId) {
  const fid = parseInt(factureId, 10);
  if (Number.isNaN(fid)) return null;
  const facture = db.get('factures').find({ id: fid }).value();
  if (!facture || isFactureSupprimee(facture)) return null;
  const dossier = facture.dossier_id ? db.get('dossiers').find({ id: facture.dossier_id }).value() : null;
  const formation = dossier?.formation_id ? db.get('formations').find({ id: dossier.formation_id }).value() : null;
  if (!formation) return facture;
  const synced = syncFactureMontantsFromFormation(facture, formation);
  db.get('factures').find({ id: facture.id }).assign(synced).write();
  return { ...facture, ...synced };
}

function normalizeTypeDocument(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'definitive' || v === 'définitive' || v === 'def') return 'definitive';
  return 'proforma';
}

function genererOuRecupererFactureDossier(dossierId, options = {}) {
  const id = parseInt(dossierId, 10);
  const dossierRow = db.get('dossiers').find({ id }).value();
  if (!dossierRow) return null;

  const formation = db.get('formations').find({ id: dossierRow.formation_id }).value();
  if (!formation) return null;

  const etabSnap = snapshotFromFormation(formation);
  const typeDocOpt =
    options.type_document != null || options.nature != null
      ? normalizeTypeDocument(options.type_document || options.nature)
      : null;

  const existing = db.get('factures').find({ dossier_id: id }).value();
  if (existing) {
    if (isFactureSupprimee(existing)) return null;
    if (!existing.etablissement_snapshot && etabSnap) {
      db.get('factures').find({ id: existing.id }).assign({ etablissement_snapshot: etabSnap }).write();
    }
    if (existing.etablissement_snapshot && etabSnap) {
      const cur = existing.etablissement_snapshot;
      const needMerge =
        (!cur.cachet_url && etabSnap.cachet_url) ||
        (!cur.logo_url && etabSnap.logo_url) ||
        (etabSnap.telephone && cur.telephone !== etabSnap.telephone) ||
        (etabSnap.compte_bancaire && cur.compte_bancaire !== etabSnap.compte_bancaire) ||
        (etabSnap.couleur_primaire && cur.couleur_primaire !== etabSnap.couleur_primaire);
      if (needMerge) {
        db.get('factures').find({ id: existing.id }).assign({
          etablissement_snapshot: { ...cur, ...etabSnap },
        }).write();
      }
    }
    if (typeDocOpt && existing.type_document !== typeDocOpt) {
      db.get('factures').find({ id: existing.id }).assign({ type_document: typeDocOpt }).write();
    }
    const current = db.get('factures').find({ id: existing.id }).value();
    const synced = syncFactureMontantsFromFormation(current, formation);
    db.get('factures').find({ id: existing.id }).assign(synced).write();
    return { ...current, ...synced, type_document: current.type_document || typeDocOpt || 'proforma' };
  }

  const etudiant = dossierRow.etudiant_id
    ? db.get('utilisateurs').find({ id: dossierRow.etudiant_id }).value()
    : null;
  const { resolveCandidatIdentite } = require('../utils/candidatIdentite');
  const identite = resolveCandidatIdentite(dossierRow, etudiant || {});
  if (!identite.prenom || !identite.nom) return null;

  const typePayeur = dossierRow.type_payeur === 'organisation' ? 'organisation' : 'etudiant';
  const payeur = typePayeur === 'organisation' && dossierRow.payeur ? dossierRow.payeur : null;

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
    type_document: typeDocOpt || 'proforma',
    date_emission: new Date().toISOString(),
    date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    lignes: mapLignesFacture(tarif),
    lignes_supplementaires: tarif.lignes_supplementaires,
    montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
    montant_ht,
    tva_taux: tva_taux * 100,
    montant_tva,
    montant_ttc,
    montant_total_a_payer: montant_ttc + (tarif.montant_supplementaires || 0),
    statut: 'emise',
    etudiant_snapshot: {
      nom: identite.nom,
      prenom: identite.prenom,
      email: identite.email,
      telephone: identite.telephone || dossierRow.telephone,
      adresse: identite.adresse || dossierRow.adresse,
      nationalite: identite.nationalite || dossierRow.nationalite,
    },
    type_payeur: typePayeur,
    payeur,
    formation_snapshot: buildFormationSnapshot(formation, tarif),
    etablissement_snapshot: etabSnap,
    created_at: new Date().toISOString(),
  };

  db.get('factures').push(facture).write();
  return facture;
}

module.exports = {
  genererOuRecupererFactureDossier,
  genererNumeroFacture,
  normalizeTypeDocument,
  syncFactureMontantsFromFormation,
  syncStoredFactureById,
  buildFormationSnapshot,
};
