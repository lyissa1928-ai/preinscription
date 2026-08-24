/**
 * Conditions d’admission publiées par établissement : plusieurs blocs HTML par établissement.
 * Lecture publique ; écriture : responsable, admin.
 * Admin sans rattachement : préciser ?etablissement_id= sur /me.
 */
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { actsAsResponsable } = require('../utils/userFonctions');

const MAX_LEN = 300000;

function findRowsForEtab(etablissementId) {
  const eid = Number(etablissementId);
  const list = db.get('conditions_admission').value() || [];
  return list
    .filter((r) => Number(r.etablissement_id) === eid)
    .sort((a, b) => {
      const oa = a.ordre != null ? Number(a.ordre) : a.id || 0;
      const ob = b.ordre != null ? Number(b.ordre) : b.id || 0;
      if (oa !== ob) return oa - ob;
      return (a.id || 0) - (b.id || 0);
    });
}

function nextOrdre(eid) {
  const rows = findRowsForEtab(eid);
  let max = 0;
  rows.forEach((r) => {
    const o = r.ordre != null ? Number(r.ordre) : 0;
    if (o > max) max = o;
  });
  return max + 1;
}

function rowById(conditionId) {
  const id = Number(conditionId);
  if (!Number.isFinite(id)) return null;
  return db.get('conditions_admission').find({ id }).value() || null;
}

/** GET /api/conditions-admission/public/:etablissementId — sans auth */
router.get('/public/:etablissementId', (req, res) => {
  const eid = parseInt(req.params.etablissementId, 10);
  if (!Number.isFinite(eid)) {
    return res.status(400).json({ message: 'Identifiant d’établissement invalide.' });
  }
  const etab = db.get('etablissements').find({ id: eid }).value();
  if (!etab || etab.actif === false) {
    return res.status(404).json({ message: 'Établissement introuvable.' });
  }
  const rows = findRowsForEtab(eid);
  const conditions = rows.map((r) => ({
    id: r.id,
    texte: r.texte != null ? String(r.texte) : '',
    updated_at: r.updated_at || null,
  }));
  return res.json({
    etablissement_id: eid,
    nom: etab.nom,
    conditions,
  });
});

router.use(authMiddleware);

function resolveEtabId(req) {
  const role = req.user.role;
  if (role === 'admin') {
    const q = parseInt(req.query.etablissement_id, 10);
    if (Number.isFinite(q)) return { etablissement_id: q };
    const fallback = req.user.etablissement_id;
    if (fallback != null && Number.isFinite(Number(fallback))) {
      return { etablissement_id: Number(fallback) };
    }
    return {
      error: {
        status: 400,
        message:
          'Paramètre etablissement_id requis (URL ?etablissement_id=) ou rattachez un établissement au compte admin.',
      },
    };
  }
  if (!actsAsResponsable(req.user)) {
    return { error: { status: 403, message: 'Accès réservé au responsable pédagogique ou à l’administrateur.' } };
  }
  const eid = req.user.etablissement_id;
  if (!eid) return { error: { status: 400, message: 'Aucun établissement associé au compte.' } };
  return { etablissement_id: Number(eid) };
}

/** GET /api/conditions-admission/me */
router.get('/me', (req, res) => {
  const r = resolveEtabId(req);
  if (r.error) return res.status(r.error.status).json({ message: r.error.message });
  const eid = r.etablissement_id;
  const etab = db.get('etablissements').find({ id: eid }).value();
  if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });
  const rows = findRowsForEtab(eid);
  const conditions = rows.map((row) => ({
    id: row.id,
    texte: row.texte != null ? String(row.texte) : '',
    updated_at: row.updated_at || null,
    updated_by_user_id: row.updated_by_user_id ?? null,
  }));
  return res.json({
    etablissement_id: eid,
    nom: etab.nom,
    conditions,
  });
});

/** POST /api/conditions-admission/me — ajoute un bloc (corps : { texte }) */
router.post('/me', (req, res) => {
  try {
    const r = resolveEtabId(req);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    const eid = r.etablissement_id;
    const etab = db.get('etablissements').find({ id: eid }).value();
    if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

    const texte = req.body?.texte;
    const str = texte === undefined || texte === null ? '' : String(texte);
    if (!str.trim()) {
      return res.status(400).json({ message: 'Le texte de la condition ne peut pas être vide.' });
    }
    if (str.length > MAX_LEN) {
      return res.status(400).json({ message: `Texte trop long (max. ${MAX_LEN} caractères).` });
    }
    const now = new Date().toISOString();
    const uid = req.user.id;
    const id = db.nextId('conditions_admission');
    const ordre = nextOrdre(eid);
    db.get('conditions_admission')
      .push({
        id,
        etablissement_id: eid,
        texte: str,
        ordre,
        updated_at: now,
        updated_by_user_id: uid,
      })
      .write();

    return res.status(201).json({
      ok: true,
      condition: {
        id,
        texte: str,
        updated_at: now,
        updated_by_user_id: uid,
      },
    });
  } catch (err) {
    console.error('[conditions-admission] POST /me', err);
    return res.status(500).json({
      message: err?.message || 'Erreur lors de l’enregistrement en base.',
    });
  }
});

/** PUT /api/conditions-admission/me/:conditionId — met à jour un bloc */
router.put('/me/:conditionId', (req, res) => {
  try {
    const r = resolveEtabId(req);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    const eid = r.etablissement_id;
    const etab = db.get('etablissements').find({ id: eid }).value();
    if (!etab) return res.status(404).json({ message: 'Établissement introuvable.' });

    const cid = parseInt(req.params.conditionId, 10);
    if (!Number.isFinite(cid)) {
      return res.status(400).json({ message: 'Identifiant de condition invalide.' });
    }
    const existing = rowById(cid);
    if (!existing || Number(existing.etablissement_id) !== Number(eid)) {
      return res.status(404).json({ message: 'Condition introuvable pour cet établissement.' });
    }

    const texte = req.body?.texte;
    const str = texte === undefined || texte === null ? '' : String(texte);
    if (!str.trim()) {
      return res.status(400).json({ message: 'Le texte ne peut pas être vide.' });
    }
    if (str.length > MAX_LEN) {
      return res.status(400).json({ message: `Texte trop long (max. ${MAX_LEN} caractères).` });
    }
    const now = new Date().toISOString();
    const uid = req.user.id;

    db.get('conditions_admission')
      .find({ id: cid })
      .assign({
        texte: str,
        updated_at: now,
        updated_by_user_id: uid,
      })
      .write();

    return res.json({
      ok: true,
      condition: {
        id: cid,
        texte: str,
        updated_at: now,
        updated_by_user_id: uid,
      },
    });
  } catch (err) {
    console.error('[conditions-admission] PUT /me/:id', err);
    return res.status(500).json({
      message: err?.message || 'Erreur lors de la mise à jour.',
    });
  }
});

/** DELETE /api/conditions-admission/me/:conditionId — supprime un bloc */
router.delete('/me/:conditionId', (req, res) => {
  const r = resolveEtabId(req);
  if (r.error) return res.status(r.error.status).json({ message: r.error.message });
  const eid = r.etablissement_id;
  const cid = parseInt(req.params.conditionId, 10);
  if (!Number.isFinite(cid)) {
    return res.status(400).json({ message: 'Identifiant de condition invalide.' });
  }
  const existing = rowById(cid);
  if (!existing || Number(existing.etablissement_id) !== Number(eid)) {
    return res.status(404).json({ message: 'Condition introuvable pour cet établissement.' });
  }
  const list = db.get('conditions_admission').value() || [];
  db.set(
    'conditions_admission',
    list.filter((x) => Number(x.id) !== cid),
  ).write();
  return res.json({ ok: true, message: 'Condition supprimée.' });
});

/** DELETE /api/conditions-admission/me — supprime tous les blocs de l’établissement */
router.delete('/me', (req, res) => {
  const r = resolveEtabId(req);
  if (r.error) return res.status(r.error.status).json({ message: r.error.message });
  const eid = r.etablissement_id;
  const list = db.get('conditions_admission').value() || [];
  db.set(
    'conditions_admission',
    list.filter((x) => Number(x.etablissement_id) !== Number(eid)),
  ).write();
  return res.json({ ok: true, message: 'Toutes les conditions d’admission ont été supprimées.' });
});

module.exports = router;
