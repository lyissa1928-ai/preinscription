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

const publicProformaSubmitLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 5,

  message: 'Trop de demandes. Réessayez dans quelques minutes.',

  keyGenerator: (req) => `public_proforma_submit:${getClientIp(req)}`,

});

const { publicAssetUrl } = require('../utils/publicAssetUrl');

const { mergeFactureProformaFromFormation, getDureeMoisEffectif } = require('../utils/formationTarifs');

const { isFactureProformaConsultablePublique } = require('../utils/proformaDemandeHelpers');

const {
  upload,
  proformaJustificatifFieldsPublic,
} = require('../utils/proformaUpload');

const { createPublicDemandeProforma } = require('../services/publicProformaDemandeService');



// POST /api/public/demande-proforma — sans compte (étudiant à distance)

router.post(

  '/demande-proforma',

  publicProformaSubmitLimiter,

  (req, res, next) => {

    upload.fields(proformaJustificatifFieldsPublic)(req, res, (err) => {

      if (err) {

        if (err.code === 'LIMIT_FILE_SIZE') {

          return res.status(400).json({ message: 'Chaque document est limité à 2 Mo.' });

        }

        return res.status(400).json({ message: err.message || 'Erreur lors de l’envoi des fichiers.' });

      }

      next();

    });

  },

  (req, res) => {

    const result = createPublicDemandeProforma({ req, body: req.body || {}, files: req.files });

    if (!result.ok) {

      return res.status(result.status).json({ message: result.message });

    }

    return res.status(result.status).json({

      message: result.message,

      reference: result.reference,

      id: result.id,

    });

  },

);



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



  // Masquer le cachet sur la facture publique si l’administration l’a désactivé

  if (result.facture_avec_cachet === false && result.etablissement_snapshot) {

    result.etablissement_snapshot = { ...result.etablissement_snapshot, cachet_url: null };

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

  const { type, etablissement_id } = req.query;

  let formations = db.get('formations').filter({ actif: true }).value();

  if (type) formations = formations.filter(f => f.type === type);

  if (etablissement_id) {

    formations = formations.filter((f) => String(f.etablissement_id) === String(etablissement_id));

  }

  res.json(formations.map(f => ({
    id: f.id,
    etablissement_id: f.etablissement_id,
    filiere_id: f.filiere_id,
    filiere_nom: (db.get('filieres').find({ id: f.filiere_id }).value() || {}).nom || null,
    titre: f.titre,
    type: f.type,
    ville: f.ville,
    niveau: f.niveau || null,
    niveau_requis: f.niveau_requis || null,
    nombre_annees: f.nombre_annees || null,
    duree: f.duree || null,
    duree_mois: f.duree_mois,
    description: f.description || null,
    debouches: f.debouches || null,
  })));
});

// GET /api/public/etablissements/:id/flyers — téléchargeables sans compte
router.get('/etablissements/:id/flyers', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab || etab.actif === false) {
    return res.status(404).json({ message: 'Établissement introuvable.' });
  }
  const { publicFlyer } = require('./flyers');
  const list = (db.get('flyers').value() || [])
    .filter((f) => Number(f.etablissement_id) === id && f.actif !== false)
    .map((f) => publicFlyer(f, req));
  res.json(list);
});

// GET /api/public/site-branding — favicon et nom plateforme (sans auth)

router.get('/site-branding', (req, res) => {

  const { getSiteConfigForClient } = require('../utils/siteConfig');

  return res.json(getSiteConfigForClient(req));

});



module.exports = router;

