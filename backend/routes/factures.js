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

const MSG_ETUDIANT_GENERER =
  'La facture est générée automatiquement à l’acceptation de votre préinscription. La génération manuelle est réservée au personnel.';

const MSG_ETUDIANT_PROFORMA_PUBLIC =
  'Pour une demande proforma, le document officiel est transmis par l’établissement. Consultez votre espace étudiant pour le statut.';

// POST /api/factures/generer/:dossierId — staff uniquement (étudiant = auto à l’acceptation)
router.post('/generer/:dossierId', authMiddleware, (req, res) => {
  if (req.user?.role === 'etudiant') {
    return res.status(403).json({ code: 'FACTURE_AUTO_ONLY', message: MSG_ETUDIANT_GENERER });
  }

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

// GET /api/factures/dossier/:dossierId — staff ou étudiant propriétaire
router.get('/dossier/:dossierId', authMiddleware, (req, res) => {
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

// Alias legacy front PublicFactureView — flux demande proforma (pas préinscription dossier)
router.get('/publique/:reference', authMiddleware, (req, res) => {
  if (req.user?.role === 'etudiant') {
    return res.status(403).json({
      code: 'FACTURE_STAFF_ONLY',
      message: MSG_ETUDIANT_PROFORMA_PUBLIC,
    });
  }
  if (!isStaffFactureRole(req.user)) {
    return res.status(403).json({
      code: 'FACTURE_STAFF_ONLY',
      message: MSG_ETUDIANT_PROFORMA_PUBLIC,
    });
  }
  return res.status(400).json({
    code: 'USE_PUBLIC_PROFORMA',
    message: 'Utilisez /api/public/facture-proforma/:reference pour les liens publics (personnel uniquement pour le PDF).',
  });
});

// GET /api/factures/:id — staff ou étudiant propriétaire
router.get('/:id', authMiddleware, (req, res) => {
  const facture = db.get('factures').find({ id: parseInt(req.params.id, 10) }).value();
  if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });
  const dossier = facture.dossier_id ? db.get('dossiers').find({ id: facture.dossier_id }).value() : null;
  const isStaff =
    req.user.role === 'admin'
    || req.user.role === 'directeur'
    || (dossier && staffEtabPeutVoirDossier(req.user, dossier, db));
  const isOwner =
    req.user.role === 'etudiant'
    && (
      Number(facture.etudiant_id) === Number(req.user.id)
      || (dossier && Number(dossier.etudiant_id) === Number(req.user.id))
    );
  if (!isStaff && !isOwner) {
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
