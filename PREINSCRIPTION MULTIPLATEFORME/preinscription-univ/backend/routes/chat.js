const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, staffOnly } = require('../middleware/auth');
const { canChatWith, conversationKey } = require('../utils/chatRules');
const chatStore = require('../database/chatStore');
const { getIO } = require('../socket/chatSocket');

const CHAT_UPLOAD_DIR = path.join(__dirname, '../uploads/chat-attachments');
try {
  fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
} catch {
  /* ignore */
}

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CHAT_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '';
      const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      cb(null, base + ext);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
});

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    prenom: u.prenom || '',
    nom: u.nom || '',
    role: u.role,
    matricule: u.matricule || null,
    etablissement_id: u.etablissement_id ?? null,
  };
}

function requireEtab(req, res, next) {
  const eid = req.user.etablissement_id ?? null;
  if (eid == null || req.user.role === 'admin') {
    return res.status(403).json({ message: 'Le chat est disponible pour les comptes rattachés à un établissement.' });
  }
  next();
}

function parseAttachmentFromBody(body) {
  if (!body || typeof body !== 'object') return null;
  const a = body.attachment;
  if (!a || typeof a !== 'object') return null;
  if (!a.url || !String(a.url).trim()) return null;
  const nameRaw = a.original_name || a.name;
  return {
    url: String(a.url).trim(),
    original_name: nameRaw ? String(nameRaw).slice(0, 500) : null,
    mime: a.mime ? String(a.mime).slice(0, 200) : null,
    size: a.size != null ? Number(a.size) : null,
  };
}

function emitChatMessage(io, eid, me, peer, msg) {
  const envelope = { ...msg, peer_id: peer.id };
  io.to(`user:${peer.id}`).emit('chat:message', envelope);
  io.to(`user:${me.id}`).emit('chat:message', envelope);
  io.to(`etab:${eid}`).emit('chat:conversation-updated', {
    key: msg.conversation_key,
    last_message_body: msg.body,
    last_sender_id: msg.sender_id,
    updated_at: msg.created_at,
    participants: [me.id, peer.id].sort((a, b) => a - b),
  });
}

router.use(authMiddleware);
router.use(requireEtab);

/** Upload fichier pour message (retourne URL publique /uploads/...) */
router.post('/upload', chatUpload.single('file'), (req, res) => {
  const me = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!me) return res.status(401).json({ message: 'Utilisateur introuvable' });
  if (!req.file) {
    return res.status(400).json({ message: 'Fichier manquant.' });
  }
  const rel = `chat-attachments/${req.file.filename}`;
  const url = `/uploads/${rel}`;
  return res.status(201).json({
    url,
    original_name: req.file.originalname || req.file.filename,
    mime: req.file.mimetype || null,
    size: req.file.size,
  });
});

/** Liste des pièces jointes échangées sur le chat (staff établissement) */
router.get('/documents', staffOnly, (req, res) => {
  const eid = req.user.etablissement_id ?? null;
  if (eid == null) {
    return res.status(403).json({ message: 'Réservé au personnel rattaché à un établissement.' });
  }
  const rows = chatStore.listAttachmentMessagesForEtablissement(eid);
  const users = db.get('utilisateurs').value() || [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const out = rows.map((m) => ({
    id: m.id,
    created_at: m.created_at,
    attachment_url: m.attachment_url,
    attachment_name: m.attachment_name,
    attachment_mime: m.attachment_mime,
    attachment_size: m.attachment_size,
    body: m.body,
    sender: publicUser(byId.get(m.sender_id)),
    conversation_key: m.conversation_key,
  }));
  return res.json({ documents: out });
});

/** Contacts autorisés (même établissement) */
router.get('/contacts', (req, res) => {
  const eid = Number(req.user.etablissement_id);
  const me = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!me) return res.status(401).json({ message: 'Utilisateur introuvable' });

  const users = db.get('utilisateurs').value() || [];
  const contacts = users
    .filter((u) => u && u.actif !== false && Number(u.etablissement_id) === eid && u.id !== me.id)
    .filter((u) => canChatWith(me, u))
    .map(publicUser)
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));

  return res.json({ contacts });
});

/** Liste des conversations (aperçu) */
router.get('/conversations', (req, res) => {
  const eid = Number(req.user.etablissement_id);
  const uid = req.user.id;
  const rows = chatStore.listConversationsForUser(uid, eid);
  const users = db.get('utilisateurs').value() || [];
  const byId = new Map(users.map((u) => [u.id, u]));

  const out = rows.map((c) => {
    const parts = c.participants || [];
    const peerId = parts.find((p) => p !== uid) ?? parts[0];
    const peer = byId.get(peerId);
    const unread = chatStore.unreadCountForConversation(uid, c.key);
    return {
      key: c.key,
      peer: publicUser(peer),
      last_message_body: c.last_message_body,
      last_sender_id: c.last_sender_id,
      updated_at: c.updated_at,
      unread,
    };
  });

  return res.json({ conversations: out });
});

router.get('/peer/:peerId/messages', (req, res) => {
  const peerId = Number(req.params.peerId);
  const eid = Number(req.user.etablissement_id);
  const me = db.get('utilisateurs').find({ id: req.user.id }).value();
  const peer = db.get('utilisateurs').find({ id: peerId }).value();
  if (!me || !peer || !canChatWith(me, peer)) {
    return res.status(403).json({ message: 'Conversation non autorisée' });
  }

  const key = conversationKey(eid, me.id, peer.id);
  const beforeId = req.query.before ? Number(req.query.before) : undefined;
  const messages = chatStore.getMessagesForConversation(key, { limit: 100, beforeId });

  return res.json({ conversation_key: key, messages });
});

router.post('/peer/:peerId/read', (req, res) => {
  const peerId = Number(req.params.peerId);
  const eid = Number(req.user.etablissement_id);
  const me = db.get('utilisateurs').find({ id: req.user.id }).value();
  const peer = db.get('utilisateurs').find({ id: peerId }).value();
  if (!me || !peer || !canChatWith(me, peer)) {
    return res.status(403).json({ message: 'Conversation non autorisée' });
  }
  const key = conversationKey(eid, me.id, peer.id);
  chatStore.markConversationRead(me.id, key);
  return res.json({ ok: true });
});

/** Envoi HTTP (secours si WebSocket indisponible) */
router.post('/peer/:peerId/messages', (req, res) => {
  const peerId = Number(req.params.peerId);
  const eid = Number(req.user.etablissement_id);
  const me = db.get('utilisateurs').find({ id: req.user.id }).value();
  const peer = db.get('utilisateurs').find({ id: peerId }).value();
  if (!me || !peer || !canChatWith(me, peer)) {
    return res.status(403).json({ message: 'Conversation non autorisée' });
  }
  const body = req.body?.body ?? req.body?.message ?? '';
  const attachment = parseAttachmentFromBody(req.body);
  const msg = chatStore.addMessage(eid, me.id, peer.id, body, attachment);
  if (!msg) return res.status(400).json({ message: 'Message vide ou pièce jointe manquante.' });
  const io = getIO();
  if (io) emitChatMessage(io, eid, me, peer, msg);
  return res.status(201).json({ message: msg });
});

module.exports = router;
