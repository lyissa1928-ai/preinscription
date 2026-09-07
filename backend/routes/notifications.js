/**
 * Notifications in-app pour tous les utilisateurs authentifiés.
 */
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notifications?limit=30
router.get('/', authMiddleware, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
  const items = (db.get('notifications').value() || [])
    .filter((n) => Number(n.user_id) === Number(req.user.id))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, limit);
  const unread = items.filter((n) => !n.read_at).length;
  res.json({ items, unread });
});

// POST /api/notifications/read-all
router.post('/read-all', authMiddleware, (req, res) => {
  const now = new Date().toISOString();
  const all = db.get('notifications').value() || [];
  all.forEach((n) => {
    if (Number(n.user_id) === Number(req.user.id) && !n.read_at) {
      db.get('notifications').find({ id: n.id }).assign({ read_at: now }).write();
    }
  });
  res.json({ message: 'Notifications marquées comme lues.' });
});

// POST /api/notifications/:id/read
router.post('/:id/read', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const n = db.get('notifications').find({ id }).value();
  if (!n || Number(n.user_id) !== Number(req.user.id)) {
    return res.status(404).json({ message: 'Notification introuvable.' });
  }
  db.get('notifications').find({ id }).assign({ read_at: new Date().toISOString() }).write();
  res.json({ ok: true });
});

module.exports = router;
