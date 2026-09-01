const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { rateLimit, getClientIp } = require('../utils/rateLimit');

const publicProformaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Trop de consultations. Réessayez plus tard.',
  keyGenerator: (req) => `public_proforma:${getClientIp(req)}:${req.params.reference || ''}`,
});
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { mergeFactureProformaFromFormation, getDureeMoisEffectif } = require('../utils/formationTarifs');
const { isFactureProformaConsultablePublique } = require('../utils/proformaDemandeHelpers');

// POST /api/public/demande-proforma — désactivé : compte candidat + justificatifs + validation pédagogique
router.post('/demande-proforma', (req, res) => {
  return res.status(403).json({
    message:
      'La demande de facture proforma nécessite un compte candidat et les pièces justificatives (dernier diplôme, relevé de notes, document lié à la formation demandée). Connectez-vous puis déposez votre demande depuis la page « Facture proforma ».',
    code: 'PROFORMA_AUTH_REQUIRED',
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
router.get('/facture-proforma/:reference', publicProformaLimiter, (req, res) => {
  const demande = db.get('demandes_proforma').find({ reference: req.params.reference }).value();
  if (!demande) return res.status(404).json({ message: 'Facture proforma introuvable.' });
  if (!isFactureProformaConsultablePublique(demande)) {
    return res.status(403).json({
      message:
        'Cette facture n’est disponible qu’après validation par le service pédagogique. Connectez-vous à votre espace étudiant pour suivre votre demande.',
      code: 'PROFORMA_NOT_VALIDATED',
    });
  }

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

// GET /api/public/etablissements/:id — Fiche publique (sans données sensibles)
router.get('/etablissements/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab || etab.actif === false) {
    return res.status(404).json({ message: 'Établissement introuvable.' });
  }
  res.json({
    id: etab.id,
    nom: etab.nom,
    type: etab.type,
    description: etab.description || null,
    adresse: etab.adresse || null,
    telephone: (etab.telephone && String(etab.telephone).trim()) || null,
    email_contact: (etab.email_contact && String(etab.email_contact).trim()) || null,
    site_web: (etab.site_web && String(etab.site_web).trim()) || null,
    logo_url: publicAssetUrl(req, etab.logo_url),
    couleur_primaire: etab.couleur_primaire || null,
    couleur_secondaire: etab.couleur_secondaire || null,
  });
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

// GET /api/public/site-branding — favicon et nom plateforme (sans auth)
router.get('/site-branding', (req, res) => {
  const { getSiteConfigForClient } = require('../utils/siteConfig');
  return res.json(getSiteConfigForClient(req));
});

module.exports = router;
