const { Server } = require('socket.io');
const db = require('../database/db');
const { verifyAccessToken } = require('../utils/jwtHelpers');
const { isTokenRevoked } = require('../utils/tokenRevocation');
const { socketRateLimit } = require('../utils/socketRateLimit');
const { canChatWith, conversationKey } = require('../utils/chatRules');
const { withFonctions } = require('../utils/userFonctions');
const { sanitizeChatAttachment } = require('../utils/chatAttachment');
const chatStore = require('../database/chatStore');

/** @type {import('socket.io').Server | null} */
let ioRef = null;

/** @returns {import('socket.io').Server | null} */
function getIO() {
  return ioRef;
}

/** @type {Map<string, number>} clé `${etabId}:${userId}` -> nombre de sockets */
const socketCountByUser = new Map();

function socketKey(etabId, userId) {
  return `${etabId}:${userId}`;
}

function initChatSocket(httpServer, { allowedCorsOrigins }) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedCorsOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });
  ioRef = io;

  io.use((socket, next) => {
    try {
      // Token uniquement via le payload `auth` du handshake (chiffré dans le
      // corps), jamais via la query string (fuite dans logs proxy / historique).
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('auth'));
      const decoded = verifyAccessToken(token);
      if (decoded.jti && isTokenRevoked(decoded.jti)) return next(new Error('auth'));
      const dbUser = db.get('utilisateurs').find({ id: decoded.id }).value();
      if (!dbUser || dbUser.actif === false) return next(new Error('auth'));
      socket.user = {
        id: dbUser.id,
        role: dbUser.role,
        etablissement_id: dbUser.etablissement_id || null,
        prenom: dbUser.prenom,
        nom: dbUser.nom,
      };
      next();
    } catch {
      next(new Error('auth'));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.user;
    if (!u.etablissement_id || u.role === 'admin') {
      socket.disconnect(true);
      return;
    }

    const eid = Number(u.etablissement_id);
    const sk = socketKey(eid, u.id);
    const prev = socketCountByUser.get(sk) || 0;
    socketCountByUser.set(sk, prev + 1);
    if (prev === 0) {
      io.to(`etab:${eid}`).emit('presence:update', { userId: u.id, online: true });
    }

    const allowedRooms = new Set([`user:${u.id}`, `etab:${eid}`]);
    const safeJoin = socket.join.bind(socket);
    socket.join = (room) => {
      if (allowedRooms.has(String(room))) return safeJoin(room);
      console.warn(`[chat] join bloqué room=${room} user=${u.id}`);
      return socket;
    };

    safeJoin(`user:${u.id}`);
    safeJoin(`etab:${eid}`);

    socket.emit('chat:ready', { userId: u.id });

    socket.on('chat:send', (payload, cb) => {
      const rl = socketRateLimit(`chat_send:${u.id}`, {
        windowMs: 60_000,
        max: parseInt(process.env.CHAT_SOCKET_MSG_MAX_PER_MIN || '30', 10) || 30,
      });
      if (!rl.allowed) {
        if (typeof cb === 'function') {
          cb({ ok: false, error: 'Trop de messages. Réessayez dans quelques secondes.' });
        }
        return;
      }
      const peerId = Number(payload?.peerId);
      const body = payload?.body;
      const peer = db.get('utilisateurs').find({ id: peerId }).value();
      if (!peer || !canChatWith(withFonctions(u), withFonctions(peer))) {
        if (typeof cb === 'function') cb({ ok: false, error: 'Interdit' });
        return;
      }
      const { attachment: attObj, invalid: attInvalid } = sanitizeChatAttachment(payload?.attachment);
      if (attInvalid) {
        if (typeof cb === 'function') cb({ ok: false, error: 'Pièce jointe invalide.' });
        return;
      }
      const msg = chatStore.addMessage(eid, u.id, peer.id, body, attObj);
      if (!msg) {
        if (typeof cb === 'function') cb({ ok: false, error: 'Message vide' });
        return;
      }
      const envelope = {
        ...msg,
        peer_id: peer.id,
      };
      io.to(`user:${peer.id}`).emit('chat:message', envelope);
      io.to(`user:${u.id}`).emit('chat:message', envelope);
      io.to(`etab:${eid}`).emit('chat:conversation-updated', {
        key: msg.conversation_key,
        last_message_body: msg.body,
        last_sender_id: msg.sender_id,
        updated_at: msg.created_at,
        participants: [u.id, peer.id].sort((a, b) => a - b),
      });
      if (typeof cb === 'function') cb({ ok: true, message: msg });
    });

    socket.on('chat:typing', ({ peerId, typing }) => {
      const pid = Number(peerId);
      if (!pid) return;
      io.to(`user:${pid}`).emit('chat:typing', { fromUserId: u.id, typing: !!typing });
    });

    socket.on('chat:read', ({ peerId }) => {
      const pid = Number(peerId);
      if (!pid) return;
      const peer = db.get('utilisateurs').find({ id: pid }).value();
      if (!peer || !canChatWith(withFonctions(u), withFonctions(peer))) return;
      const key = conversationKey(eid, u.id, pid);
      chatStore.markConversationRead(u.id, key);
      io.to(`user:${pid}`).emit('chat:read', { byUserId: u.id, conversation_key: key });
    });

    socket.on('disconnect', () => {
      const n = (socketCountByUser.get(sk) || 1) - 1;
      if (n <= 0) {
        socketCountByUser.delete(sk);
        io.to(`etab:${eid}`).emit('presence:update', { userId: u.id, online: false });
      } else {
        socketCountByUser.set(sk, n);
      }
    });
  });

  return io;
}

module.exports = { initChatSocket, getIO };
