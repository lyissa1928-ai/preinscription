const crypto = require('crypto');
const db = require('../database/db');

/**
 * Verrouillage de compte après échecs de connexion (persisté en base, par utilisateur).
 * Variables : ACCOUNT_LOCK_MAX_ATTEMPTS (défaut 3), ACCOUNT_LOCK_DURATION_MS (défaut 15 min).
 */
function accountLockConfig() {
  const maxAttempts = parseInt(process.env.ACCOUNT_LOCK_MAX_ATTEMPTS || '3', 10);
  const durationMs = parseInt(
    process.env.ACCOUNT_LOCK_DURATION_MS || String(15 * 60 * 1000),
    10,
  );
  return {
    maxAttempts: Number.isFinite(maxAttempts) && maxAttempts >= 1 ? maxAttempts : 3,
    lockDurationMs: Number.isFinite(durationMs) && durationMs >= 60_000 ? durationMs : 15 * 60 * 1000,
  };
}

function reloadUser(userId) {
  return db.get('utilisateurs').find({ id: userId }).value();
}

/**
 * Si lock_until est dépassé, déverrouille et remet les compteurs à zéro.
 */
function refreshAccountLockState(user) {
  if (!user || !user.id) return user;
  const raw = user.lock_until;
  if (!raw) {
    if (user.is_locked === true) {
      db.get('utilisateurs').find({ id: user.id }).assign({
        is_locked: false,
        login_attempts: typeof user.login_attempts === 'number' ? user.login_attempts : 0,
      }).write();
      return reloadUser(user.id);
    }
    return user;
  }
  const t = Date.parse(raw);
  if (Number.isNaN(t) || t > Date.now()) return user;
  db.get('utilisateurs').find({ id: user.id }).assign({
    lock_until: null,
    is_locked: false,
    login_attempts: 0,
  }).write();
  return reloadUser(user.id);
}

function isAccountLockedNow(user) {
  if (!user) return false;
  const u = refreshAccountLockState(user);
  if (!u.lock_until) return false;
  const t = Date.parse(u.lock_until);
  return !Number.isNaN(t) && t > Date.now();
}

function retryAfterSec(user) {
  const u = refreshAccountLockState(user);
  if (!u.lock_until) return 0;
  const t = Date.parse(u.lock_until);
  if (Number.isNaN(t) || t <= Date.now()) return 0;
  return Math.max(1, Math.ceil((t - Date.now()) / 1000));
}

/**
 * Incrémente les échecs ; au seuil, verrouille le compte.
 */
function recordAccountLoginFailure(userId) {
  const cfg = accountLockConfig();
  const u = reloadUser(userId);
  if (!u) return { locked: false, attempts: 0 };

  const prev = typeof u.login_attempts === 'number' ? u.login_attempts : 0;
  const next = prev + 1;
  if (next >= cfg.maxAttempts) {
    const lockUntil = new Date(Date.now() + cfg.lockDurationMs).toISOString();
    db.get('utilisateurs').find({ id: userId }).assign({
      login_attempts: 0,
      is_locked: true,
      lock_until: lockUntil,
    }).write();
    return { locked: true, attempts: next, lockUntil };
  }
  db.get('utilisateurs').find({ id: userId }).assign({ login_attempts: next }).write();
  return { locked: false, attempts: next };
}

function clearAccountLockOnSuccess(userId) {
  db.get('utilisateurs').find({ id: userId }).assign({
    login_attempts: 0,
    is_locked: false,
    lock_until: null,
  }).write();
}

/** Mot de passe aléatoire pour réinitialisation admin (hors email automatique). */
function generateTempPassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const n = Math.min(Math.max(length, 10), 32);
  for (let i = 0; i < n; i += 1) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

module.exports = {
  accountLockConfig,
  refreshAccountLockState,
  isAccountLockedNow,
  retryAfterSec,
  recordAccountLoginFailure,
  clearAccountLockOnSuccess,
  generateTempPassword,
};
