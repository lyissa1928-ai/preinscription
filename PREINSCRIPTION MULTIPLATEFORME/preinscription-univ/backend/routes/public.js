const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { buildLignesForfaitAnnuel, mergeFactureProformaFromFormation, getDureeMoisEffectif } = require('../utils/formationTarifs');

// POST /api/public/demande-proforma
// Accessible sans compte — génère immédiatement une facture proforma
router.post('/demande-proforma', (req, res) => {
  const {
    prenom, nom, email, telephone, type_formation, formation_id, etablissement_id, niveau, details,
    type_payeur,
    payeur_nom, payeur_prenom, payeur_relation, payeur_telephone,
    payeur_org_nom, payeur_org_ninea, payeur_org_contact
  } = req.body;

  if (!prenom || !nom || !email || !telephone || !type_formation || !formation_id) {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Adresse email invalide.' });
  }

  const fid = parseInt(formation_id, 10);
  const existsFormation = db.get('formations').find({ id: fid }).value();
  if (!existsFormation) {
    return res.status(404).json({ message: 'Formation introuvable ou identifiant invalide.' });
  }
  if (existsFormation.actif === false) {
    return res.status(404).json({
      message: 'Cette formation n’est plus proposée (désactivée). Choisissez une autre formation ou contactez l’établissement.',
    });
  }
  const formation = existsFormation;

  // Vérifier cohérence type / formation
  if (formation.type !== type_formation) {
    return res.status(400).json({ message: 'La formation choisie ne correspond pas au type sélectionné.' });
  }

  // Récupérer l'établissement pour snapshot
  const etabId = etablissement_id ? parseInt(etablissement_id) : (formation.etablissement_id || null);
  const etab = etabId ? db.get('etablissements').find({ id: etabId }).value() : null;
  const etablissement_snapshot = etab ? {
    nom: etab.nom,
    type: etab.type,
    adresse: etab.adresse || '',
    telephone: etab.telephone || '',
    email_contact: etab.email_contact || '',
    site_web: etab.site_web || '',
    logo_url: publicAssetUrl(req, etab.logo_url),
    cachet_url: publicAssetUrl(req, etab.cachet_url),
    couleur_primaire: etab.couleur_primaire || '#1e40af',
    couleur_secondaire: etab.couleur_secondaire || '#3b82f6',
    ninea: etab.ninea || '',
    compte_bancaire: etab.compte_bancaire || ''
  } : null;

  const id = db.nextId('demandes_proforma');
  const reference = `DEM-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
  const numeroFacture = `FACT-PUB-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;

  const tarif = buildLignesForfaitAnnuel(formation);
  const montantHT = tarif.montant_ht;
  const validiteDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const demande = {
    id,
    reference,
    prenom: prenom.trim(),
    nom: nom.trim(),
    email: email.trim().toLowerCase(),
    telephone: telephone.trim(),
    niveau: niveau ? niveau.trim() : null,
    type_formation,
    formation_id: parseInt(formation_id),
    etablissement_id: etablissement_id ? parseInt(etablissement_id) : (formation.etablissement_id || null),
    formation_titre: formation.titre,
    formation_description: formation.description || null,
    formation_ville: formation.ville || null,
    formation_niveau_requis: formation.niveau_requis || null,
    formation_mensualite: formation.mensualite || null,
    formation_duree_mois: tarif.duree_mois,
    details: details ? details.trim() : null,
    // Destinataire / payeur
    type_payeur: type_payeur || 'etudiant',
    payeur: type_payeur === 'tuteur'
      ? { prenom: (payeur_prenom || '').trim(), nom: (payeur_nom || '').trim(), relation: (payeur_relation || '').trim(), telephone: (payeur_telephone || '').trim() }
      : type_payeur === 'organisation'
      ? { org_nom: (payeur_org_nom || '').trim(), ninea: (payeur_org_ninea || '').trim(), contact: (payeur_org_contact || '').trim() }
      : null,
    etablissement_snapshot,
    statut: 'nouvelle',
    created_at: new Date().toISOString(),
    // Facture générée immédiatement
    facture: {
      numero: numeroFacture,
      lignes: tarif.lignes,
      lignes_frais_supplementaires: tarif.lignes_supplementaires,
      montant_supplementaires_hors_forfait: tarif.montant_supplementaires,
      montant_ht: montantHT,
      tva: 0,
      montant_ttc: montantHT,
      validite_jusqu_au: validiteDate
    }
  };

  db.get('demandes_proforma').push(demande).write();

  res.status(201).json({
    message: 'Votre facture proforma a été générée.',
    reference
  });
});

// Construit un snapshot depuis un objet établissement
function buildSnapshot(etab, req) {
  return {
    nom: etab.nom,
    type: etab.type,
    adresse: etab.adresse || '',
    telephone: etab.telephone || '',
    email_contact: etab.email_contact || '',
    site_web: etab.site_web || '',
    logo_url: publicAssetUrl(req, etab.logo_url),
    cachet_url: publicAssetUrl(req, etab.cachet_url),
    couleur_primaire: etab.couleur_primaire || '#1e40af',
    couleur_secondaire: etab.couleur_secondaire || '#3b82f6',
    ninea: (etab.ninea || '').trim(),
    rc: (etab.rc || '').trim(),
    arrete: (etab.arrete || '').trim(),
    compte_bancaire: (etab.compte_bancaire || '').trim()
  };
}

// GET /api/public/facture-proforma/:reference
router.get('/facture-proforma/:reference', (req, res) => {
  const demande = db.get('demandes_proforma').find({ reference: req.params.reference }).value();
  if (!demande) return res.status(404).json({ message: 'Facture proforma introuvable.' });

  let result = { ...demande };

  // Toujours reconstruire le snapshot depuis la DB (données toujours à jour : logo, RC, arrêté, etc.)
  let etabId = result.etablissement_id || null;

  // Si l'etab_id manque sur le proforma, le chercher via la formation
  if (!etabId && result.formation_id) {
    const formation = db.get('formations').find({ id: result.formation_id }).value();
    if (formation && formation.etablissement_id) {
      etabId = formation.etablissement_id;
      db.get('demandes_proforma').find({ reference: req.params.reference })
        .assign({ etablissement_id: etabId }).write();
    }
  }

  if (etabId) {
    const etab = db.get('etablissements').find({ id: etabId }).value();
    if (etab) result.etablissement_snapshot = buildSnapshot(etab, req);
  }

  // Enrichir la mensualité depuis la formation si manquante sur l'ancien proforma
  if (result.formation_mensualite === undefined && result.formation_id) {
    const formation = db.get('formations').find({ id: result.formation_id }).value();
    if (formation) result.formation_mensualite = formation.mensualite || null;
  }

  // Aligner la facture affichée sur le barème actuel de la formation (même règle qu’à la génération)
  if (result.formation_id) {
    const formation = db.get('formations').find({ id: result.formation_id }).value();
    if (formation) {
      result.facture = mergeFactureProformaFromFormation(formation, result.facture);
      result.formation_mensualite = formation.mensualite ?? result.formation_mensualite ?? null;
      result.formation_duree_mois = getDureeMoisEffectif(formation);
    }
  }

  res.json(result);
});

// GET /api/public/formations — Liste publique filtrée
router.get('/formations', (req, res) => {
  const { type } = req.query;
  let formations = db.get('formations').filter({ actif: true }).value();
  if (type) formations = formations.filter(f => f.type === type);
  res.json(formations.map(f => ({
    id: f.id,
    titre: f.titre,
    type: f.type,
    ville: f.ville,
    prix: f.prix,
    frais_inscription: f.frais_inscription,
    mensualite: f.mensualite,
    duree_mois: f.duree_mois,
    niveau_requis: f.niveau_requis
  })));
});

module.exports = router;
