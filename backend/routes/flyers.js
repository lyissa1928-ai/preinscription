/**
 * Flyers établissement — upload admin, téléchargement public.
 * Association : filière (plus formation).
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { canEditEtabIdentite, isPlatformAdmin, userAdministersEtablissement } = require('../utils/staffRoles');
const { publicAssetUrl } = require('../utils/publicAssetUrl');
const { logAudit } = require('../utils/auditLog');
const { verifyDiskFile, unlinkQuiet } = require('../utils/verifyUploadedFile');
const { optionalClamScanFile } = require('../utils/optionalClamScan');

const router = express.Router();

const flyersDir = path.join(__dirname, '..', 'uploads', 'flyers');
if (!fs.existsSync(flyersDir)) fs.mkdirSync(flyersDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, flyersDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `${Date.now()}-flyer${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

function canManageFlyers(user, etabId) {
  if (isPlatformAdmin(user)) return true;
  return canEditEtabIdentite(user, etabId) || userAdministersEtablissement(user, etabId);
}

function resolveFiliereId(flyer) {
  if (flyer.filiere_id) return Number(flyer.filiere_id) || null;
  // Rétrocompat : anciens flyers liés à une formation → filière de la formation
  if (flyer.formation_id) {
    const fo = db.get('formations').find({ id: Number(flyer.formation_id) }).value();
    return fo?.filiere_id != null ? Number(fo.filiere_id) : null;
  }
  return null;
}

function publicFlyer(f, req) {
  const filiereId = resolveFiliereId(f);
  const filiere = filiereId
    ? db.get('filieres').find({ id: filiereId }).value()
    : null;
  return {
    id: f.id,
    etablissement_id: f.etablissement_id,
    filiere_id: filiereId,
    filiere_nom: filiere?.nom || null,
    formation_id: f.formation_id || null,
    titre: f.titre,
    description: f.description || '',
    debouches: f.debouches || '',
    file_url: publicAssetUrl(req, f.file_url),
    file_name: f.file_name || null,
    created_at: f.created_at,
  };
}

// GET /api/etablissements/:etabId/flyers — staff
router.get('/:etabId/flyers', authMiddleware, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  if (Number.isNaN(etabId)) return res.status(400).json({ message: 'Identifiant invalide.' });
  if (!canManageFlyers(req.user, etabId) && Number(req.user.etablissement_id) !== etabId) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }
  const list = (db.get('flyers').value() || [])
    .filter((f) => Number(f.etablissement_id) === etabId && f.actif !== false)
    .map((f) => publicFlyer(f, req));
  res.json(list);
});

// POST /api/etablissements/:etabId/flyers
router.post('/:etabId/flyers', authMiddleware, upload.single('fichier'), async (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  if (Number.isNaN(etabId)) return res.status(400).json({ message: 'Identifiant invalide.' });
  if (!canManageFlyers(req.user, etabId)) {
    return res.status(403).json({ message: 'Seul l’administrateur de l’établissement peut ajouter des flyers.' });
  }
  const etab = db.get('etablissements').find({ id: etabId }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  if (!req.file) return res.status(400).json({ message: 'Fichier flyer obligatoire (PDF ou image).' });

  const fullPath = path.join(flyersDir, req.file.filename);
  const v = await verifyDiskFile(fullPath, req.file.originalname, 'dossier');
  if (!v.ok) {
    unlinkQuiet(fullPath);
    return res.status(400).json({ message: v.message || 'Fichier invalide.' });
  }
  const clam = await optionalClamScanFile(fullPath);
  if (!clam.ok) {
    unlinkQuiet(fullPath);
    return res.status(400).json({ message: clam.message || 'Fichier refusé.' });
  }

  const filiereId = req.body.filiere_id ? parseInt(req.body.filiere_id, 10) : null;
  let filiere = null;
  if (filiereId) {
    filiere = db.get('filieres').find({ id: filiereId, etablissement_id: etabId }).value();
    if (!filiere) {
      unlinkQuiet(fullPath);
      return res.status(400).json({ message: 'Filière introuvable pour cet établissement.' });
    }
  }

  const titre = String(req.body.titre || filiere?.nom || 'Flyer').trim();
  const description = String(req.body.description || filiere?.description || '').trim();
  const debouches = String(req.body.debouches || '').trim();
  const id = db.nextId('flyers');
  const flyer = {
    id,
    etablissement_id: etabId,
    filiere_id: filiereId || null,
    formation_id: null,
    titre,
    description,
    debouches,
    file_url: `/uploads/flyers/${req.file.filename}`,
    file_name: req.file.originalname,
    mime_type: req.file.mimetype,
    actif: true,
    created_at: new Date().toISOString(),
    created_by: req.user.id,
  };
  db.get('flyers').push(flyer).write();
  logAudit(req, 'flyer_cree', 'flyer', id, { etablissement_id: etabId, titre, filiere_id: filiereId });
  res.status(201).json(publicFlyer(flyer, req));
});

// PUT /api/etablissements/:etabId/flyers/:id
router.put('/:etabId/flyers/:id', authMiddleware, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id, 10);
  if (!canManageFlyers(req.user, etabId)) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }
  const flyer = db.get('flyers').find({ id }).value();
  if (!flyer || Number(flyer.etablissement_id) !== etabId) {
    return res.status(404).json({ message: 'Flyer introuvable.' });
  }
  const patch = {};
  if (req.body.titre !== undefined) patch.titre = String(req.body.titre).trim();
  if (req.body.description !== undefined) patch.description = String(req.body.description).trim();
  if (req.body.debouches !== undefined) patch.debouches = String(req.body.debouches).trim();
  if (req.body.filiere_id !== undefined) {
    const fid = req.body.filiere_id ? parseInt(req.body.filiere_id, 10) : null;
    if (fid) {
      const filiere = db.get('filieres').find({ id: fid, etablissement_id: etabId }).value();
      if (!filiere) return res.status(400).json({ message: 'Filière introuvable.' });
    }
    patch.filiere_id = fid;
    patch.formation_id = null;
  }
  db.get('flyers').find({ id }).assign({ ...patch, updated_at: new Date().toISOString() }).write();
  res.json(publicFlyer(db.get('flyers').find({ id }).value(), req));
});

// DELETE /api/etablissements/:etabId/flyers/:id
router.delete('/:etabId/flyers/:id', authMiddleware, (req, res) => {
  const etabId = parseInt(req.params.etabId, 10);
  const id = parseInt(req.params.id, 10);
  if (!canManageFlyers(req.user, etabId)) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }
  const flyer = db.get('flyers').find({ id }).value();
  if (!flyer || Number(flyer.etablissement_id) !== etabId) {
    return res.status(404).json({ message: 'Flyer introuvable.' });
  }
  db.get('flyers').find({ id }).assign({ actif: false, updated_at: new Date().toISOString() }).write();
  logAudit(req, 'flyer_supprime', 'flyer', id, { etablissement_id: etabId });
  res.json({ message: 'Flyer retiré.' });
});

module.exports = router;
module.exports.publicFlyer = publicFlyer;
