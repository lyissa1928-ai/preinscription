/**
 * Révocation JWT en mémoire (jti) — déconnexion serveur, sans casser les anciens tokens sans jti.
 */
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
}

function isTokenRevoked(jti) {
  if (!jti) return false;
  pruneExpired();
  const expMs = revoked.get(String(jti));
  if (expMs == null) return false;
  if (Date.now() > expMs) {
    revoked.delete(String(jti));
    return false;
  }
  return true;
}

module.exports = { revokeToken, isTokenRevoked };
