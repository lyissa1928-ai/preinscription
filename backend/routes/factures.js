const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { genererOuRecupererFactureDossier, syncStoredFactureById } = require('../services/factureService');
const { isFactureSupprimee } = require('../utils/factureVisibility');
const { parsePagination, wantsPagination, paginateArray } = require('../utils/pagination');
const {
  staffEtabPeutVoirDossier,
  peutAccederFactureDocumentaire,
  isStaffFactureRole,
} = require('../utils/factureAccess');

const MSG_ETUDIANT_FACTURE =
  'Le téléchargement et la consultation du document officiel de facture sont réservés au personnel autorisé. Consultez le statut de votre dossier dans votre espace étudiant.';

function refuseEtudiantFacture(req, res) {
  if (req.user?.role === 'etudiant') {
    return res.status(403).json({
      code: 'FACTURE_STAFF_ONLY',
      message: MSG_ETUDIANT_FACTURE,
    });
  }
  return null;
}

// POST /api/factures/generer/:dossierId — staff uniquement
router.post('/generer/:dossierId', authMiddleware, (req, res) => {
  if (refuseEtudiantFacture(req, res)) return;

  const dossierId = parseInt(req.params.dossierId, 10);
  const dossier = db.get('dossiers').find({ id: dossierId }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });

  const isAdmin = req.user.role === 'admin' || req.user.role === 'directeur';
  const isStaffEtab = staffEtabPeutVoirDossier(req.user, dossier, db);

  if (!isAdmin && !isStaffEtab) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const rowBefore = db.get('factures').find({ dossier_id: dossierId }).value();
  if (rowBefore?.deleted_at && !isAdmin && !isStaffEtab) {
    return res.status(404).json({ message: 'Facture proforma introuvable.' });
  }
  if (rowBefore?.deleted_at && (isAdmin || isStaffEtab)) {
    db.get('factures').find({ id: rowBefore.id }).assign({ deleted_at: null, deleted_by_user_id: null }).write();
  }

  const existed = !!rowBefore;
  const facture = genererOuRecupererFactureDossier(dossierId);
  if (!facture) {
    return res.status(422).json({
      message: 'Impossible de générer la facture : dossier ou formation incomplet (vérifiez prénom, nom ou e-mail du bénéficiaire).',
    });
  }
  res.status(existed ? 200 : 201).json(facture);
});

// GET /api/factures/dossier/:dossierId — document officiel : staff uniquement
router.get('/dossier/:dossierId', authMiddleware, (req, res) => {
  if (refuseEtudiantFacture(req, res)) return;

  const dossierId = parseInt(req.params.dossierId, 10);
  const dossier = db.get('dossiers').find({ id: dossierId }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  if (!peutAccederFactureDocumentaire(req.user, dossier, db)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  const facture = db.get('factures').find({ dossier_id: dossierId }).value();
  if (!facture) return res.status(404).json({ message: 'Aucune facture générée' });
  if (isFactureSupprimee(facture) && !staffEtabPeutVoirDossier(req.user, dossier, db)) {
    return res.status(404).json({ message: 'Aucune facture générée' });
  }
  const synced = genererOuRecupererFactureDossier(dossierId);
  res.json(synced || facture);
});

// Alias legacy front PublicFactureView — délégation + refus étudiant authentifié
router.get('/publique/:reference', authMiddleware, (req, res) => {
  if (refuseEtudiantFacture(req, res)) return;
  if (!isStaffFactureRole(req.user)) {
    return res.status(403).json({
      code: 'FACTURE_STAFF_ONLY',
      message: MSG_ETUDIANT_FACTURE,
    });
  }
  return res.status(400).json({
    code: 'USE_PUBLIC_PROFORMA',
    message: 'Utilisez /api/public/facture-proforma/:reference pour les liens publics (personnel uniquement pour le PDF).',
  });
});

// GET /api/factures/:id — staff uniquement
router.get('/:id', authMiddleware, (req, res) => {
  if (refuseEtudiantFacture(req, res)) return;

  const facture = db.get('factures').find({ id: parseInt(req.params.id, 10) }).value();
  if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });
  const dossier = facture.dossier_id ? db.get('dossiers').find({ id: facture.dossier_id }).value() : null;
  const isStaff =
    req.user.role === 'admin'
    || req.user.role === 'directeur'
    || (dossier && staffEtabPeutVoirDossier(req.user, dossier, db));
  if (!isStaff) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  if (isFactureSupprimee(facture) && !isStaff) {
    return res.status(404).json({ message: 'Facture non trouvée' });
  }
  const synced = syncStoredFactureById(facture.id);
  res.json(synced || facture);
});

// GET /api/factures - Admin : toutes les factures
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const factures = (db.get('factures').value() || []).filter((f) => !isFactureSupprimee(f));
  if (wantsPagination(req.query)) {
    const { page, limit } = parsePagination(req.query, { page: 1, limit: 50 });
    const { items, pagination } = paginateArray(factures, page, limit);
    return res.json({ factures: items, pagination });
  }
  res.json(factures);
});

module.exports = router;
