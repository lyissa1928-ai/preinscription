/**
 * Mémoire de conversation en RAM (sessions anonymes / connectées).
 * TTL court — pas de données personnelles sensibles.
 */
const sessions = new Map();
const TTL_MS = Number(process.env.CHATBOT_SESSION_TTL_MS || 2 * 60 * 60 * 1000);
const MAX_HISTORY = 12;

function prune() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.updatedAt > TTL_MS) sessions.delete(id);
  }
}

function getSession(sessionId) {
  prune();
  if (!sessionId) return null;
  return sessions.get(String(sessionId)) || null;
}

function ensureSession(sessionId) {
  prune();
  const id = String(sessionId || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  let s = sessions.get(id);
  if (!s) {
    s = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastFormationIds: [],
      lastDomainIds: [],
      lastIntent: null,
      history: [],
      etablissementId: null,
    };
    sessions.set(id, s);
  }
  return s;
}

function touchSession(session, patch = {}) {
  Object.assign(session, patch, { updatedAt: Date.now() });
  if (session.history?.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
  sessions.set(session.id, session);
  return session;
}

function pushTurn(session, role, text) {
  session.history = session.history || [];
  session.history.push({
    role,
    text: String(text || '').slice(0, 2000),
    at: new Date().toISOString(),
  });
  touchSession(session);
}

module.exports = { getSession, ensureSession, touchSession, pushTurn, MAX_HISTORY };
