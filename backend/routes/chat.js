const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, staffOnly } = require('../middleware/auth');
const { canChatWith, conversationKey } = require('../utils/chatRules');
const { withFonctions } = require('../utils/userFonctions');
const chatStore = require('../database/chatStore');
const { getIO } = require('../socket/chatSocket');
const { verifyDiskFile, extensionForStoredDossierFile, detectDossierMagicFormat, unlinkQuiet } = require('../utils/verifyUploadedFile');
const { parsePagination, wantsPagination, paginateArray } = require('../utils/pagination');
const { rateLimit, getClientIp } = require('../utils/rateLimit');
const { sanitizeChatAttachment } = require('../utils/chatAttachment');

const chatUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Trop d’envois de fichiers. Réessayez plus tard.',
  keyGenerator: (req) => `chat_upload:${getClientIp(req)}:${req.user?.id || 'anon'}`,
});
const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: 'Trop de messages envoyés. Ralentissez.',
  keyGenerator: (req) => `chat_msg:${getClientIp(req)}:${req.user?.id || 'anon'}`,
});

const CHAT_UPLOAD_DIR = path.join(__dirname, '../uploads/chat-attachments');
try {
  fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
} catch {
  /* ignore */
}

const CHAT_MAX_UPLOAD = 12 * 1024 * 1024;

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CHAT_UPLOAD_DIR),
    filename: (_req, _file, cb) => {
      const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      cb(null, `${base}.upload`);
    },
  }),
  limits: { fileSize: CHAT_MAX_UPLOAD },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (['.svg', '.html', '.htm', '.js', '.exe'].includes(ext)) {
      return cb(new Error('Format non autorisé.'));
    }
    cb(null, true);
  },
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

// Validation stricte des pièces jointes : voir utils/chatAttachment.js.

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
router.post('/upload', chatUploadLimiter, chatUpload.single('file'), async (req, res) => {
  const me = db.get('utilisateurs').find({ id: req.user.id }).value();
  if (!me) return res.status(401).json({ message: 'Utilisateur introuvable' });
  if (!req.file) {
    return res.status(400).json({ message: 'Fichier manquant.' });
  }

  const tempPath = path.join(CHAT_UPLOAD_DIR, req.file.filename);
  const v = await verifyDiskFile(tempPath, req.file.originalname, 'chat');
  if (!v.ok) {
    unlinkQuiet(tempPath);
    return res.status(400).json({ message: v.message || 'Fichier refusé.' });
  }

  let buf;
  try {
    buf = fs.readFileSync(tempPath);
  } catch {
    unlinkQuiet(tempPath);
    return res.status(400).json({ message: 'Lecture du fichier impossible.' });
  }
  const magic = detectDossierMagicFormat(buf);
  const extFinal = extensionForStoredDossierFile(magic);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extFinal}`;
  const finalPath = path.join(CHAT_UPLOAD_DIR, safeName);
  try {
    fs.renameSync(tempPath, finalPath);
  } catch {
    unlinkQuiet(tempPath);
    return res.status(500).json({ message: 'Enregistrement du fichier impossible.' });
  }

  const rel = `chat-attachments/${safeName}`;
  const url = `/uploads/${rel}`;
  const safeOriginal = path.basename(String(req.file.originalname || safeName)).slice(0, 200);
  return res.status(201).json({
    url,
    original_name: safeOriginal,
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
  if (wantsPagination(req.query)) {
    const { page, limit } = parsePagination(req.query, { page: 1, limit: 50 });
    const { items, pagination } = paginateArray(out, page, limit);
    return res.json({ documents: items, pagination });
  }
  return res.json({ documents: out });
});

/** Contacts autorisés (même établissement) */
router.get('/contacts', (req, res) => {
  const eid = Number(req.user.etablissement_id);
  const me = withFonctions(db.get('utilisateurs').find({ id: req.user.id }).value());
  if (!me) return res.status(401).json({ message: 'Utilisateur introuvable' });

  const users = db.get('utilisateurs').value() || [];
  const contacts = users
    .filter((u) => u && u.actif !== false && Number(u.etablissement_id) === eid && u.id !== me.id)
    .filter((u) => canChatWith(me, withFonctions(u)))
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
  const me = withFonctions(db.get('utilisateurs').find({ id: req.user.id }).value());
  const peer = withFonctions(db.get('utilisateurs').find({ id: peerId }).value());
  if (!me || !peer || !canChatWith(me, peer)) {
    return res.status(403).json({ message: 'Conversation non autorisée' });
  }

  const key = conversationKey(eid, me.id, peer.id);
  const beforeId = req.query.before ? Number(req.query.before) : undefined;
  const pageLimit = req.query.limit ? Math.min(Number(req.query.limit) || 80, 200) : undefined;
  const { messages, has_more: hasMore } = chatStore.getMessagesForConversation(key, {
    limit: pageLimit,
    beforeId,
  });

  return res.json({ conversation_key: key, messages, has_more: !!hasMore });
});

router.post('/peer/:peerId/read', (req, res) => {
  const peerId = Number(req.params.peerId);
  const eid = Number(req.user.etablissement_id);
  const me = withFonctions(db.get('utilisateurs').find({ id: req.user.id }).value());
  const peer = withFonctions(db.get('utilisateurs').find({ id: peerId }).value());
  if (!me || !peer || !canChatWith(me, peer)) {
    return res.status(403).json({ message: 'Conversation non autorisée' });
  }
  const key = conversationKey(eid, me.id, peer.id);
  chatStore.markConversationRead(me.id, key);
  return res.json({ ok: true });
});

/** Envoi HTTP (secours si WebSocket indisponible) */
router.post('/peer/:peerId/messages', chatMessageLimiter, (req, res) => {
  const peerId = Number(req.params.peerId);
  const eid = Number(req.user.etablissement_id);
  const me = withFonctions(db.get('utilisateurs').find({ id: req.user.id }).value());
  const peer = withFonctions(db.get('utilisateurs').find({ id: peerId }).value());
  if (!me || !peer || !canChatWith(me, peer)) {
    return res.status(403).json({ message: 'Conversation non autorisée' });
  }
  const body = req.body?.body ?? req.body?.message ?? '';
  const { attachment, invalid } = sanitizeChatAttachment(req.body?.attachment);
  if (invalid) {
    return res.status(400).json({ message: 'Pièce jointe invalide.' });
  }
  const msg = chatStore.addMessage(eid, me.id, peer.id, body, attachment);
  if (!msg) return res.status(400).json({ message: 'Message vide ou pièce jointe manquante.' });
  const io = getIO();
  if (io) emitChatMessage(io, eid, me, peer, msg);
  return res.status(201).json({ message: msg });
});

module.exports = router;
