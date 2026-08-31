/**
 * Sessions refresh + JTIs révoqués (persistance fichier légère, lowdb).
 */
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const crypto = require('crypto');
const { parseDurationMs } = require('../utils/durationMs');
const { installWriteLockOnAdapter, runWithDbLockSync } = require('../utils/dbWriteQueue');

const STORE_PATH = path.join(__dirname, 'auth-sessions.json');
const adapter = new FileSync(STORE_PATH);
installWriteLockOnAdapter(adapter, STORE_PATH);
const sessionDb = low(adapter);

sessionDb
  .defaults({
    refresh_tokens: [],
    revoked_jtis: [],
    _nextId: { refresh: 1 },
  })
  .write();

function withLock(fn) {
  return runWithDbLockSync(STORE_PATH, fn);
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function refreshTtlMs() {
  return parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 86_400_000);
}

function nextRefreshId() {
  return withLock(() => {
    const id = sessionDb.get('_nextId.refresh').value() || 1;
    sessionDb.set('_nextId.refresh', id + 1).write();
    return id;
  });
}

function pruneExpiredRefreshTokens() {
  withLock(() => {
    const now = Date.now();
    const rows = sessionDb.get('refresh_tokens').value() || [];
    const kept = rows.filter((r) => {
      if (r.revoked_at) return false;
      const exp = new Date(r.expires_at).getTime();
      return Number.isFinite(exp) && exp > now;
    });
    if (kept.length !== rows.length) {
      sessionDb.set('refresh_tokens', kept).write();
    }
  });
}

function pruneExpiredRevokedJtis() {
  withLock(() => {
    const now = Date.now();
    const rows = sessionDb.get('revoked_jtis').value() || [];
    const kept = rows.filter((r) => Number(r.exp_ms) > now);
    if (kept.length !== rows.length) {
      sessionDb.set('revoked_jtis', kept).write();
    }
  });
}

function createRefreshToken(userId) {
  pruneExpiredRefreshTokens();
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + refreshTtlMs()).toISOString();
  const row = {
    id: nextRefreshId(),
    user_id: Number(userId),
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    revoked_at: null,
  };
  withLock(() => {
    sessionDb.get('refresh_tokens').push(row).write();
  });
  return { refreshToken: raw, expiresAt };
}

function validateRefreshToken(raw) {
  if (!raw) return null;
  pruneExpiredRefreshTokens();
  const tokenHash = hashToken(raw);
  const row = (sessionDb.get('refresh_tokens').value() || []).find(
    (r) => r.token_hash === tokenHash && !r.revoked_at,
  );
  if (!row) return null;
  const exp = new Date(row.expires_at).getTime();
  if (!Number.isFinite(exp) || exp <= Date.now()) return null;
  return row;
}

function revokeRefreshToken(raw) {
  if (!raw) return;
  const tokenHash = hashToken(raw);
  withLock(() => {
    const row = sessionDb.get('refresh_tokens').find({ token_hash: tokenHash }).value();
    if (row) {
      sessionDb
        .get('refresh_tokens')
        .find({ id: row.id })
        .assign({ revoked_at: new Date().toISOString() })
        .write();
    }
  });
}

function revokeAllRefreshTokensForUser(userId) {
  const uid = Number(userId);
  const now = new Date().toISOString();
  withLock(() => {
    const rows = sessionDb.get('refresh_tokens').value() || [];
    let changed = false;
    const next = rows.map((r) => {
      if (r.user_id === uid && !r.revoked_at) {
        changed = true;
        return { ...r, revoked_at: now };
      }
      return r;
    });
    if (changed) sessionDb.set('refresh_tokens', next).write();
  });
}

function rotateRefreshToken(raw, userId) {
  revokeRefreshToken(raw);
  return createRefreshToken(userId);
}

function persistRevokedJti(jti, expMsEpoch) {
  if (!jti || !expMsEpoch) return;
  pruneExpiredRevokedJtis();
  withLock(() => {
    const exists = (sessionDb.get('revoked_jtis').value() || []).some(
      (r) => String(r.jti) === String(jti),
    );
    if (!exists) {
      sessionDb.get('revoked_jtis').push({ jti: String(jti), exp_ms: Number(expMsEpoch) }).write();
    }
  });
}

function isJtiPersistentlyRevoked(jti) {
  if (!jti) return false;
  pruneExpiredRevokedJtis();
  const now = Date.now();
  const row = (sessionDb.get('revoked_jtis').value() || []).find((r) => String(r.jti) === String(jti));
  if (!row) return false;
  if (now > Number(row.exp_ms)) return false;
  return true;
}

function loadRevokedJtisIntoMemory(revokeFn) {
  pruneExpiredRevokedJtis();
  const rows = sessionDb.get('revoked_jtis').value() || [];
  for (const r of rows) {
    if (r.jti && r.exp_ms) revokeFn(r.jti, r.exp_ms);
  }
}

module.exports = {
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
  persistRevokedJti,
  isJtiPersistentlyRevoked,
  loadRevokedJtisIntoMemory,
  pruneExpiredRefreshTokens,
};
