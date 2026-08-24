/**
 * Révocation JWT (jti) — mémoire + persistance fichier légère.
 */
const {
  persistRevokedJti,
  isJtiPersistentlyRevoked,
  loadRevokedJtisIntoMemory,
} = require('../database/authSessionStore');

const revoked = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [jti, expMs] of revoked.entries()) {
    if (now > expMs) revoked.delete(jti);
  }
}

function revokeToken(jti, expMsEpoch) {
  if (!jti || !expMsEpoch) return;
  pruneExpired();
  revoked.set(String(jti), Number(expMsEpoch));
  persistRevokedJti(jti, expMsEpoch);
}

function isTokenRevoked(jti) {
  if (!jti) return false;
  pruneExpired();
  if (isJtiPersistentlyRevoked(jti)) return true;
  const expMs = revoked.get(String(jti));
  if (expMs == null) return false;
  if (Date.now() > expMs) {
    revoked.delete(String(jti));
    return false;
  }
  return true;
}

function initTokenRevocationFromDisk() {
  loadRevokedJtisIntoMemory(revokeToken);
}

module.exports = { revokeToken, isTokenRevoked, initTokenRevocationFromDisk };
