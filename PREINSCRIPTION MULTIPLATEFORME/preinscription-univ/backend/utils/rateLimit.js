const { logSecurityEvent } = require('./securityEvent');
const { checkRateLimit } = require('./rateLimitStore');

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
    const key = keyGenerator(req);
    checkRateLimit(key, windowMs, max)
      .then(({ allowed, retryAfterSec }) => {
        if (!allowed) {
          console.warn(
            `[SECURITY][RATE_LIMIT] ip=${getClientIp(req)} method=${req.method} path=${req.originalUrl || req.url} key=${key}`,
          );
          logSecurityEvent(req, 'rate_limit_block', {
            key,
            max,
            window_ms: windowMs,
            retry_after_sec: retryAfterSec,
            backend: String(process.env.REDIS_URL || '').trim() ? 'redis_or_memory' : 'memory',
          }, 'warning');
          res.setHeader('Retry-After', String(retryAfterSec));
          return res.status(429).json({ message, code: 'RATE_LIMIT' });
        }
        return next();
      })
      .catch(next);
  };
}

module.exports = { rateLimit, getClientIp };
