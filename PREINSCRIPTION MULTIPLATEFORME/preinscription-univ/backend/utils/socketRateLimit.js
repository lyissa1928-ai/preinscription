/**
 * Rate limit léger en mémoire pour événements Socket.io (par utilisateur).
 */
const buckets = new Map();

function socketRateLimit(key, { windowMs = 60_000, max = 30 } = {}) {
  const now = Date.now();
  const hit = buckets.get(key);
  if (!hit || hit.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true };
  }
  if (hit.count >= max) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((hit.expiresAt - now) / 1000)) };
  }
  hit.count += 1;
  buckets.set(key, hit);
  return { allowed: true };
}

function resetSocketRateLimitForTests() {
  buckets.clear();
}

module.exports = { socketRateLimit, resetSocketRateLimitForTests };
