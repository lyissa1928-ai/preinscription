const buckets = new Map();
const { logSecurityEvent } = require('./securityEvent');

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function rateLimit(options = {}) {
  const windowMs = Number(options.windowMs || 60_000);
  const max = Number(options.max || 60);
  const message = options.message || 'Trop de requêtes, réessayez plus tard.';
  const keyGenerator = typeof options.keyGenerator === 'function'
    ? options.keyGenerator
    : (req) => `${req.method}:${req.path}:${getClientIp(req)}`;

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const hit = buckets.get(key);
    if (!hit || hit.expiresAt <= now) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }
    if (hit.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((hit.expiresAt - now) / 1000));
      // Journal sécurité léger: utile pour détection brute-force/abus.
      console.warn(
        `[SECURITY][RATE_LIMIT] ip=${getClientIp(req)} method=${req.method} path=${req.originalUrl || req.url} key=${key}`
      );
      logSecurityEvent(req, 'rate_limit_block', {
        key,
        max,
        window_ms: windowMs,
        retry_after_sec: retryAfterSec,
      }, 'warning');
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ message });
    }
    hit.count += 1;
    buckets.set(key, hit);
    return next();
  };
}

module.exports = { rateLimit, getClientIp };

