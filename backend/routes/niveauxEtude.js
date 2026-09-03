/**
 * CRUD niveaux d'étude (admin) + liste publique active.
 */
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const {
  listNiveaux,
  seedDefaultNiveaux,
  findNiveauByLibelleOrCode,
  ensureNiveauxCollection,
} = require('../utils/niveauxEtude');

ensureNiveauxCollection(db);
seedDefaultNiveaux(db);

// GET /api/niveaux-etude — actifs (public / authentifié)
router.get('/', (req, res) => {
  const all = String(req.query.all || '') === '1';
  if (all) {
    // Liste complète : admin uniquement
    return authMiddleware(req, res, () => {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Accès réservé à l’administrateur.' });
      }
      return res.json(listNiveaux(db, { actifsOnly: false }));
    });
  }
  return res.json(listNiveaux(db, { actifsOnly: true }));
});

router.use(authMiddleware);

// POST — créer
router.post('/', adminOnly, (req, res) => {
  const { code, libelle, ordre, actif } = req.body || {};
  if (!libelle || String(libelle).trim() === '') {
    return res.status(400).json({ message: 'Le libellé du niveau est obligatoire.' });
  }
  const lib = String(libelle).trim();
  const cod = code != null && String(code).trim() ? String(code).trim().toUpperCase() : lib.toUpperCase().slice(0, 12);
  if (findNiveauByLibelleOrCode(db, lib) || findNiveauByLibelleOrCode(db, cod)) {
    return res.status(409).json({ message: 'Un niveau avec ce code ou libellé existe déjà.' });
  }
  const id = db.nextId ? db.nextId('niveaux_etude') : (() => {
    const n = db.get('_nextId.niveaux_etude').value() || 1;
    db.set('_nextId.niveaux_etude', n + 1).write();
    return n;
  })();
  const now = new Date().toISOString();
  const row = {
    id,
    code: cod,
    libelle: lib,
    ordre: ordre != null ? Number(ordre) || 0 : 100,
    actif: actif !== false,
    created_at: now,
    updated_at: now,
  };
  db.get('niveaux_etude').push(row).write();
  res.status(201).json(row);
});

// PUT — modifier
router.put('/:id', adminOnly, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.get('niveaux_etude').find({ id }).value();
  if (!row) return res.status(404).json({ message: 'Niveau introuvable.' });
  const { code, libelle, ordre, actif } = req.body || {};
  const patch = { updated_at: new Date().toISOString() };
  if (libelle != null) {
    const lib = String(libelle).trim();
    if (!lib) return res.status(400).json({ message: 'Libellé invalide.' });
    const clash = findNiveauByLibelleOrCode(db, lib);
    if (clash && Number(clash.id) !== id) {
      return res.status(409).json({ message: 'Libellé déjà utilisé.' });
    }
    patch.libelle = lib;
  }
  if (code != null) {
    const cod = String(code).trim().toUpperCase();
    const clash = findNiveauByLibelleOrCode(db, cod);
    if (clash && Number(clash.id) !== id) {
      return res.status(409).json({ message: 'Code déjà utilisé.' });
    }
    patch.code = cod;
  }
  if (ordre != null) patch.ordre = Number(ordre) || 0;
  if (actif != null) patch.actif = !!actif;
  db.get('niveaux_etude').find({ id }).assign(patch).write();
  res.json(db.get('niveaux_etude').find({ id }).value());
});

// PATCH actif / inactif
router.patch('/:id/actif', adminOnly, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.get('niveaux_etude').find({ id }).value();
  if (!row) return res.status(404).json({ message: 'Niveau introuvable.' });
  const actif = req.body?.actif !== false && req.body?.actif !== 0;
  db.get('niveaux_etude').find({ id }).assign({ actif, updated_at: new Date().toISOString() }).write();
  res.json(db.get('niveaux_etude').find({ id }).value());
});

// DELETE — soft si utilisé par une formation, sinon hard
router.delete('/:id', adminOnly, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.get('niveaux_etude').find({ id }).value();
  if (!row) return res.status(404).json({ message: 'Niveau introuvable.' });
  const used = (db.get('formations').value() || []).some(
    (f) =>
      String(f.niveau || '').trim().toLowerCase() === String(row.libelle).trim().toLowerCase()
      || String(f.niveau || '').trim().toLowerCase() === String(row.code).trim().toLowerCase(),
  );
  if (used) {
    db.get('niveaux_etude').find({ id }).assign({ actif: false, updated_at: new Date().toISOString() }).write();
    return res.json({
      message: 'Niveau désactivé (encore référencé par des formations).',
      niveau: db.get('niveaux_etude').find({ id }).value(),
    });
  }
  db.get('niveaux_etude').remove({ id }).write();
  res.json({ message: 'Niveau supprimé.', id });
});

module.exports = router;
