const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { genererOuRecupererFactureDossier, syncStoredFactureById } = require('../services/factureService');
const { isFactureSupprimee } = require('../utils/factureVisibility');
const { parsePagination, wantsPagination, paginateArray } = require('../utils/pagination');

function dossierDansEtablissementUtilisateur(dossier, user) {
  if (!user.etablissement_id) return false;
  const eid = Number(user.etablissement_id);
  if (dossier.etablissement_id != null && Number(dossier.etablissement_id) === eid) return true;
  if (dossier.formation_id) {
    const f = db.get('formations').find({ id: dossier.formation_id }).value();
    return f && Number(f.etablissement_id) === eid;
  }
  return false;
}

// POST /api/factures/generer/:dossierId - Générer une facture proforma
router.post('/generer/:dossierId', authMiddleware, (req, res) => {
  const dossierId = parseInt(req.params.dossierId);
  const dossier = db.get('dossiers').find({ id: dossierId }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });

  const isOwner = dossier.etudiant_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isStaffEtab =
    ['responsable', 'comptable', 'agent_admin', 'controleur_qualite'].includes(req.user.role) &&
    dossierDansEtablissementUtilisateur(dossier, req.user);

  if (!isOwner && !isAdmin && !isStaffEtab) {
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
  if (!facture) return res.status(500).json({ message: 'Impossible de générer la facture' });
  res.status(existed ? 200 : 201).json(facture);
});

// GET /api/factures/dossier/:dossierId
router.get('/dossier/:dossierId', authMiddleware, (req, res) => {
  const dossierId = parseInt(req.params.dossierId);
  const dossier = db.get('dossiers').find({ id: dossierId }).value();
  if (!dossier) return res.status(404).json({ message: 'Dossier non trouvé' });
  const ok =
    req.user.role === 'admin' ||
    dossier.etudiant_id === req.user.id ||
    (['responsable', 'comptable', 'agent_admin', 'controleur_qualite'].includes(req.user.role) &&
      dossierDansEtablissementUtilisateur(dossier, req.user));
  if (!ok) return res.status(403).json({ message: 'Accès refusé' });
  const facture = db.get('factures').find({ dossier_id: dossierId }).value();
  if (!facture) return res.status(404).json({ message: 'Aucune facture générée' });
  const isStaffView =
    req.user.role === 'admin' ||
    (['responsable', 'comptable', 'agent_admin', 'controleur_qualite'].includes(req.user.role) &&
      dossierDansEtablissementUtilisateur(dossier, req.user));
  if (isFactureSupprimee(facture) && !isStaffView) {
    return res.status(404).json({ message: 'Aucune facture générée' });
  }
  const synced = genererOuRecupererFactureDossier(dossierId);
  res.json(synced || facture);
});

// GET /api/factures/:id
router.get('/:id', authMiddleware, (req, res) => {
  const facture = db.get('factures').find({ id: parseInt(req.params.id) }).value();
  if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });
  if (req.user.role !== 'admin' && facture.etudiant_id !== req.user.id) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  if (isFactureSupprimee(facture) && req.user.role !== 'admin' && facture.etudiant_id === req.user.id) {
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
