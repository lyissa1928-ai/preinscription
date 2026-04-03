const { getClientIp } = require('./rateLimit');

const buckets = new Map();

function loginLockoutConfig() {
  return {
    maxFailures: Math.max(3, parseInt(process.env.LOGIN_LOCKOUT_MAX_FAILURES || '8', 10) || 8),
    lockoutMs: Math.max(60_000, parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS || String(15 * 60 * 1000), 10) || 15 * 60 * 1000),
  };
}

function lockKey(ip, emailNorm) {
  return `${ip}|${String(emailNorm || '').toLowerCase()}`;
}

/**
 * Verrouillage progressif après échecs de connexion (mémoire process, par IP+email).
 */
function isLoginLocked(req, emailNorm) {
  const ip = getClientIp(req);
  const k = lockKey(ip, emailNorm);
  const hit = buckets.get(k);
  if (!hit || !hit.lockUntil) return { locked: false };
  const now = Date.now();
  if (now < hit.lockUntil) {
    return {
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil((hit.lockUntil - now) / 1000)),
    };
  }
  buckets.delete(k);
  return { locked: false };
}

function recordLoginFailure(req, emailNorm) {
  const cfg = loginLockoutConfig();
  const ip = getClientIp(req);
  const k = lockKey(ip, emailNorm);
  const now = Date.now();
  let hit = buckets.get(k);
  if (!hit || (hit.lockUntil && now >= hit.lockUntil)) {
    hit = { failures: 0, lockUntil: 0 };
  }
  if (hit.lockUntil && now < hit.lockUntil) {
    return { locked: true, retryAfterSec: Math.ceil((hit.lockUntil - now) / 1000) };
  }
  hit.failures += 1;
  if (hit.failures >= cfg.maxFailures) {
    hit.lockUntil = now + cfg.lockoutMs;
    hit.failures = 0;
  }
  buckets.set(k, hit);
  return { locked: false, failures: hit.failures };
}

function clearLoginLockout(req, emailNorm) {
  const ip = getClientIp(req);
  buckets.delete(lockKey(ip, emailNorm));
}

module.exports = {
  loginLockoutConfig,
  isLoginLocked,
  recordLoginFailure,
  clearLoginLockout,
};
